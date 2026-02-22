import { useState, useEffect, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { songApi, lyricsApi } from '../utils/api';
import LyricsPanel from './LyricsPanel';
import VideoPlayer from './VideoPlayer';

export default function NowPlaying({ onFullscreen }) {
    const { currentSong, setCurrentSong, mode, setMode, isPlaying, currentLyricIndex, seek } = usePlayer();
    const { user } = useAuth();
    const [likeState, setLikeState] = useState({ liked: false, count: 0 });
    const [liking, setLiking] = useState(false);
    const [tab, setTab] = useState('lyrics');
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    // ── Lyrics Management States ──────────────────────────────────────────────
    const [searchMode, setSearchMode] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [scraping, setScraping] = useState(false);
    const [saving, setSaving] = useState(false);
    const [previewLyrics, setPreviewLyrics] = useState(null);
    const [selectedResult, setSelectedResult] = useState(null);
    const [isFallback, setIsFallback] = useState(false);
    const [error, setError] = useState('');
    const [editMode, setEditMode] = useState(false);
    const [editText, setEditText] = useState('');
    const [importMode, setImportMode] = useState(false);
    const [importText, setImportText] = useState('');

    useEffect(() => {
        if (currentSong) {
            setLikeState({ liked: !!currentSong.isLiked, count: currentSong.likes || 0 });
            setTab('lyrics');
            // Reset lyrics states
            setSearchMode(false);
            setSearchResults([]);
            setPreviewLyrics(null);
            setSelectedResult(null);
            setIsFallback(false);
            setError('');
            setEditMode(false);
            setImportMode(false);
        }
    }, [currentSong?._id, currentSong?._id, currentSong?.isLiked, currentSong?.coverUrl]);

    // Close menu on outside click
    useEffect(() => {
        if (!menuOpen) return;
        const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [menuOpen]);

    const handleLike = async () => {
        if (!user || liking) return;
        setLiking(true);
        try {
            const data = await songApi.like(currentSong._id);
            setLikeState({ liked: data.liked, count: data.likes });
        } catch { }
        setLiking(false);
    };

    // ── Lyrics Handlers ──────────────────────────────────────────────────────
    const handleSearch = async () => {
        if (!currentSong) return;
        setSearching(true);
        setError('');
        setSearchResults([]);
        setPreviewLyrics(null);
        setIsFallback(false);
        setSearchMode(true);
        try {
            let query = `${currentSong.title} ${currentSong.artist}`;
            let data = await lyricsApi.search(query);
            if (data.success && data.results.length > 0) {
                setSearchResults(data.results);
            } else {
                setIsFallback(true);
                data = await lyricsApi.search(currentSong.title);
                if (data.success && data.results.length > 0) setSearchResults(data.results);
                else setError('No results found on Genius');
            }
        } catch { setError('Failed to search Genius'); }
        setSearching(false);
    };

    const handleScrape = async (result) => {
        setSelectedResult(result);
        setScraping(true);
        setError('');
        try {
            const data = await lyricsApi.scrape(result.url);
            if (data.success && data.lyrics) setPreviewLyrics(data.lyrics);
            else setError('Could not extract lyrics');
        } catch { setError('Failed to scrape lyrics'); }
        setScraping(false);
    };

    const handleSave = async () => {
        if (!previewLyrics || !currentSong) return;
        setSaving(true);
        try {
            const data = await lyricsApi.save(currentSong._id, previewLyrics);
            if (data.success) {
                await handleSyncAI(data.song.rawLyrics);
                setSearchMode(false);
                setPreviewLyrics(null);
            }
        } catch { setError('Save failed'); }
        setSaving(false);
    };

    const handleEditStart = () => {
        setMenuOpen(false);
        setEditMode(true);
        setEditText(currentSong.rawLyrics || currentSong.syncedLyrics?.map(l => l.text).join('\n') || '');
    };

    const handleSaveEdit = async () => {
        if (!editText.trim() || !currentSong) return;
        setSaving(true);
        try {
            const data = await lyricsApi.save(currentSong._id, editText);
            if (data.success) {
                await handleSyncAI(editText);
                setEditMode(false);
            }
        } catch { setError('Edit failed'); }
        setSaving(false);
    };

    const handleSaveImport = async () => {
        if (!importText.trim() || !currentSong) return;
        setSaving(true);
        try {
            const lines = importText.split('\n');
            const synced = [];
            const timeRegex = /\[(\d+):(\d+)(?:\.(\d+))?\]/g;
            lines.forEach(line => {
                const matches = [...line.matchAll(timeRegex)];
                const text = line.replace(timeRegex, '').trim();
                if (!text && matches.length === 0) return;
                matches.forEach(match => {
                    const min = parseInt(match[1]);
                    const sec = parseInt(match[2]);
                    const msPart = match[3] || '0';
                    const ms = parseInt(msPart.padEnd(3, '0').slice(0, 3));
                    const time = min * 60 + sec + ms / 1000;
                    synced.push({ time, text });
                });
            });
            const parsed = synced.sort((a, b) => a.time - b.time);
            if (parsed.length === 0) {
                setError('No valid timestamps found');
                setSaving(false);
                return;
            }
            const data = await songApi.update(currentSong._id, {
                syncedLyrics: parsed,
                lyricsType: 'synced'
            });
            if (data.success) {
                setCurrentSong(prev => ({
                    ...prev,
                    syncedLyrics: data.song.syncedLyrics,
                    lyricsType: data.song.lyricsType
                }));
                setImportMode(false);
            }
        } catch { setError('Import failed'); }
        setSaving(false);
    };

    const handleSyncAI = async (lyricsToSyncOverride) => {
        if (!currentSong) return;
        setSaving(true);
        try {
            const lyricsToSync = lyricsToSyncOverride || (editMode ? editText : (currentSong.rawLyrics || ''));
            if (!lyricsToSync?.trim()) return;
            const data = await lyricsApi.syncAI(currentSong._id, lyricsToSync);
            if (data.success) {
                setCurrentSong(prev => ({
                    ...prev,
                    syncedLyrics: data.song.syncedLyrics,
                    rawLyrics: data.song.rawLyrics,
                    lyricsType: data.song.lyricsType
                }));
                if (editMode) setEditMode(false);
            }
        } catch (err) { setError(err.message || 'AI Sync failed'); }
        setSaving(false);
    };

    if (!currentSong) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-6">
                <div className="w-full glass-card flex flex-col items-center justify-center gap-5 p-12">
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-[var(--bg-card)] border border-[var(--border-main)] shadow-xl">
                        <svg className="w-9 h-9 text-[var(--text-muted-2)]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-[var(--text-muted)] text-sm font-semibold">Nothing playing</p>
                        <p className="text-[var(--text-muted-2)] text-xs mt-1">Select a song to start listening</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Album art */}
            <div className="flex-shrink-0 px-5 pt-5">
                <div className="relative aspect-square w-full overflow-hidden rounded-2xl" style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.5)' }}>
                    <div className={`absolute inset-0 transition-opacity duration-500 ${mode === 'video' ? 'opacity-0' : 'opacity-100'}`}>
                        {currentSong.coverUrl ? (
                            <img src={`${currentSong.coverUrl}?t=${new Date(currentSong.updatedAt || currentSong.createdAt).getTime()}`} alt={currentSong.title} className="w-full h-full object-contain" style={{ background: 'rgba(0,0,0,0.1)' }} />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[var(--bg-card)]">
                                <svg className="w-20 h-20 text-[var(--border-main)]" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                                </svg>
                            </div>
                        )}
                    </div>
                    {currentSong.videoUrl && <VideoPlayer visible={mode === 'video'} />}
                </div>
            </div>

            {/* Song title + artist + like */}
            <div className="px-5 pt-4 pb-2 flex-shrink-0">
                <div className="flex items-start justify-between gap-2">
                    <h2 className="font-bold text-lg text-[var(--text-main)] truncate flex-1 tracking-tight">{currentSong.title}</h2>
                    {user && (
                        <button onClick={handleLike} disabled={liking} className="flex-shrink-0 mt-0.5 transition-transform hover:scale-110 active:scale-90" style={{ color: likeState.liked ? 'var(--accent)' : 'var(--text-muted-2)' }}>
                            <svg className="w-5 h-5" fill={likeState.liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={likeState.liked ? 0 : 1.8} viewBox="0 0 24 24">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                            </svg>
                        </button>
                    )}
                </div>
                <p className="text-sm mt-0.5 truncate font-medium" style={{ color: 'var(--text-muted)' }}>
                    {currentSong.artist}
                    {/* Album name hidden per user request */}
                </p>
                {currentSong.videoUrl && (
                    <button
                        onClick={() => { setMode('video'); onFullscreen?.(); }}
                        className="mt-3 w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                        style={{ background: 'linear-gradient(135deg, #fc3c44, #ff6b6b)', color: 'white' }}
                    >
                        🎬 Watch in Fullscreen
                    </button>
                )}
            </div>

            {/* Tabs + More Menu */}
            <div className="flex items-center justify-between px-5 pb-1 flex-shrink-0 border-b border-[var(--border-main)] relative">
                <div className="flex gap-4">
                    {[
                        { key: 'lyrics', label: 'Lyrics' },
                        currentSong.videoUrl && { key: 'watch', label: 'Watch' },
                        { key: 'info', label: 'Info' }
                    ].filter(Boolean).map(t => (
                        <button
                            key={t.key}
                            onClick={() => {
                                setTab(t.key === 'watch' ? 'lyrics' : t.key);
                                if (t.key === 'watch') setMode('video');
                                else if (mode === 'video') setMode('audio');
                            }}
                            className="pb-2 text-sm font-bold border-b-2 -mb-px transition-all"
                            style={(tab === t.key || (t.key === 'watch' && mode === 'video'))
                                ? { borderColor: 'var(--accent)', color: 'var(--accent)' }
                                : { borderColor: 'transparent', color: 'var(--text-muted)' }
                            }
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* More Menu Toggle */}
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="pb-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                        </svg>
                    </button>

                    {/* Dropdown */}
                    {menuOpen && (
                        <div className="absolute right-0 top-full mt-1 z-50 w-40 rounded-xl overflow-hidden shadow-2xl animate-fade-in backdrop-blur-xl"
                            style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)' }}>
                            <button
                                onClick={() => { setMenuOpen(false); handleSearch(); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold transition-colors text-[var(--text-main)] hover:bg-[var(--bg-card)]"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                Genius Search
                            </button>
                            <button
                                onClick={handleEditStart}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold transition-colors text-[var(--text-main)] hover:bg-[var(--bg-card)]"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                Edit Lyrics
                            </button>
                            <button
                                onClick={() => { setMenuOpen(false); handleSyncAI(); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold transition-colors text-[var(--text-main)] hover:bg-[var(--bg-card)]"
                            >
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg>
                                Sync AI
                            </button>
                            <button
                                onClick={() => { setMenuOpen(false); setImportMode(true); setImportText(''); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold transition-colors text-[var(--text-main)] hover:bg-[var(--bg-card)]"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                Import LRC
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-hidden">
                {tab === 'lyrics' ? (
                    <LyricsPanel
                        searchMode={searchMode} setSearchMode={setSearchMode}
                        editMode={editMode} setEditMode={setEditMode}
                        searching={searching} setSearching={setSearching}
                        scraping={scraping} setScraping={setScraping}
                        saving={saving} setSaving={setSaving}
                        searchResults={searchResults} setSearchResults={setSearchResults}
                        previewLyrics={previewLyrics} setPreviewLyrics={setPreviewLyrics}
                        selectedResult={selectedResult} setSelectedResult={setSelectedResult}
                        isFallback={isFallback} setIsFallback={setIsFallback}
                        error={error} setError={setError}
                        editText={editText} setEditText={setEditText}
                        importMode={importMode} setImportMode={setImportMode}
                        importText={importText} setImportText={setImportText}
                        handleSearch={handleSearch} handleScrape={handleScrape} handleSave={handleSave}
                        handleSaveEdit={handleSaveEdit} handleSyncAI={handleSyncAI} handleEditStart={handleEditStart}
                        handleSaveImport={handleSaveImport}
                    />
                ) : (
                    <div className="p-5 space-y-3 overflow-y-auto h-full scrollbar-hide">
                        {[
                            { label: 'Title', value: currentSong.title },
                            { label: 'Artist', value: currentSong.artist },
                            currentSong.album && { label: 'Album', value: currentSong.album },
                            { label: 'Lyrics', value: currentSong.lyricsType || 'none' },
                            { label: 'Lines', value: `${currentSong.syncedLyrics?.length || 0} synced` },
                            { label: 'Plays', value: `${currentSong.plays || 0}` },
                            { label: 'DB ID', value: currentSong._id },
                            { label: 'LRC Count', value: currentSong.syncedLyrics?.length || 0 },
                        ].filter(Boolean).map(({ label, value }) => (
                            <div key={label} className="flex justify-between py-2 border-b border-[var(--border-light)]">
                                <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--text-muted-2)' }}>{label}</span>
                                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{value}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
