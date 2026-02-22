import { useEffect, useRef, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { songApi, lyricsApi } from '../utils/api';
import { formatTime } from '../utils/format';
import PlaylistModal from './PlaylistModal';
import VideoPlayer from './VideoPlayer';

export default function FullscreenPlayer({ theme, onClose, isMobile }) {
    const {
        currentSong, isPlaying, isLoading,
        currentTime, duration, volume, isMuted,
        currentLyricIndex,
        shuffle, toggleShuffle,
        loop, cycleLoop,
        togglePlay, seek, skipNext, skipPrev,
        setVolume, setIsMuted,
        setCurrentSong,
        mode, setMode
    } = usePlayer();

    const { user } = useAuth();
    const [likeState, setLikeState] = useState({ liked: false, count: 0 });
    const [liking, setLiking] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [lyricsMenuOpen, setLyricsMenuOpen] = useState(false);
    const [showPlaylist, setShowPlaylist] = useState(false);
    const [lyricsViewMode, setLyricsViewMode] = useState('synced'); // 'synced' | 'full'

    // Genius search state
    const [searchMode, setSearchMode] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [scraping, setScraping] = useState(false);
    const [savingLyrics, setSavingLyrics] = useState(false);
    const [previewLyrics, setPreviewLyrics] = useState(null);
    const [selectedResult, setSelectedResult] = useState(null);
    const [isFallback, setIsFallback] = useState(false);
    const [error, setError] = useState('');
    const [editMode, setEditMode] = useState(false);
    const [editText, setEditText] = useState('');
    const [importMode, setImportMode] = useState(false);
    const [importText, setImportText] = useState('');

    const [activeTab, setActiveTab] = useState('lyrics'); // 'lyrics' | 'info'
    const [isImmersive, setIsImmersive] = useState(false);
    const lyricsRef = useRef(null);
    const menuRef = useRef(null);
    const lyricsMenuRef = useRef(null);
    const activeRef = useRef(null);

    // Sync like state
    useEffect(() => {
        if (currentSong) setLikeState({ liked: !!currentSong.isLiked, count: currentSong.likes || 0 });
    }, [currentSong?._id, currentSong?.isLiked]);

    // Auto-scroll lyrics
    useEffect(() => {
        if (activeRef.current && lyricsRef.current) {
            activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [currentLyricIndex]);

    // ESC to close
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    // Reset when song changes
    useEffect(() => {
        setSearchMode(false);
        setSearchResults([]);
        setPreviewLyrics(null);
        setSelectedResult(null);
        setIsFallback(false);
        setError('');

        // Auto-search if lyrics are missing
        if (currentSong && !currentSong.syncedLyrics?.length && !currentSong.rawLyrics && activeTab === 'lyrics') {
            setSearchMode(true);
            handleSearch();
        }
    }, [currentSong?._id, activeTab]);

    // Close menus on outside click
    useEffect(() => {
        const handler = (e) => {
            if (menuOpen && menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
            if (lyricsMenuOpen && lyricsMenuRef.current && !lyricsMenuRef.current.contains(e.target)) setLyricsMenuOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [menuOpen, lyricsMenuOpen]);

    const handleLike = async () => {
        if (!user || liking) return;
        setLiking(true);
        try {
            const data = await songApi.like(currentSong._id);
            setLikeState({ liked: data.liked, count: data.likes });
        } catch { }
        setLiking(false);
    };

    const progress = duration ? (currentTime / duration) * 100 : 0;
    const handleSeek = (e) => seek((parseFloat(e.target.value) / 100) * duration);
    const handleVolume = (e) => {
        const val = parseFloat(e.target.value);
        setVolume(val);
        if (val > 0) setIsMuted(false);
    };

    const parseLRC = (lrcText) => {
        const lines = lrcText.split('\n');
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

        return synced.sort((a, b) => a.time - b.time);
    };

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
                setSearching(false);
                return;
            }
            setIsFallback(true);
            query = currentSong.title;
            data = await lyricsApi.search(query);
            if (data.success && data.results.length > 0) {
                setSearchResults(data.results);
            } else {
                setError('No results found on Genius');
            }
        } catch {
            setError('Failed to search Genius');
        }
        setSearching(false);
    };

    const handleScrape = async (result) => {
        setSelectedResult(result);
        setScraping(true);
        setError('');
        try {
            const data = await lyricsApi.scrape(result.url);
            if (data.success && data.lyrics) {
                setPreviewLyrics(data.lyrics);
            } else {
                setError('Could not extract lyrics from this page');
            }
        } catch {
            setError('Failed to scrape lyrics');
        }
        setScraping(false);
    };

    const handleSaveLyrics = async () => {
        if (!previewLyrics || !currentSong) return;
        setSavingLyrics(true);
        setError('');
        try {
            const data = await lyricsApi.save(currentSong._id, previewLyrics);
            if (data.success) {
                await handleSyncAI(data.song.rawLyrics);
                setSearchMode(false);
                setPreviewLyrics(null);
                setSearchResults([]);
            }
        } catch {
            setError('Failed to save lyrics');
        }
        setSavingLyrics(false);
    };

    const handleEditStart = () => {
        setLyricsMenuOpen(false);
        setEditMode(true);
        setEditText(currentSong.rawLyrics || currentSong.syncedLyrics?.map(l => l.text).join('\n') || '');
    };

    const handleSaveEdit = async () => {
        if (!editText.trim() || !currentSong) return;
        setSavingLyrics(true);
        setError('');
        try {
            const data = await lyricsApi.save(currentSong._id, editText);
            if (data.success) {
                await handleSyncAI(editText);
                setEditMode(false);
            }
        } catch {
            setError('Failed to save edit');
        }
        setSavingLyrics(false);
    };

    const handleSaveImport = async () => {
        if (!importText.trim() || !currentSong) return;
        setSavingLyrics(true);
        setError('');
        try {
            const parsed = parseLRC(importText);
            if (parsed.length === 0) {
                setError('No valid timestamps found. Format: [mm:ss.xx] Lyrics');
                setSavingLyrics(false);
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
        } catch {
            setError('Failed to import LRC');
        }
        setSavingLyrics(false);
    };

    const handleSyncAI = async (lyricsToSyncOverride) => {
        if (!currentSong) return;
        setSavingLyrics(true);
        setLyricsMenuOpen(false);
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
        } catch (err) {
            setError(err.message || 'AI Sync failed.');
        }
        setSavingLyrics(false);
    };

    if (!currentSong) return null;

    const lyrics = currentSong?.syncedLyrics || [];
    let reconstructedRaw = currentSong?.rawLyrics || '';
    if (!reconstructedRaw && lyrics.length) {
        let lines = [];
        let lastSection = null;
        lyrics.forEach(l => {
            if (l.section && l.section !== lastSection) {
                lines.push(`[${l.section}]`);
                lastSection = l.section;
            }
            lines.push(l.text || '');
        });
        reconstructedRaw = lines.join('\n');
    }

    const groups = [];
    let lastSec = null;
    for (let i = 0; i < lyrics.length; i++) {
        const sec = lyrics[i].section || null;
        if (sec && sec !== lastSec) {
            groups.push({ type: 'section', label: sec, key: `sec-${i}` });
            lastSec = sec;
        }
        groups.push({ type: 'line', lyric: lyrics[i], index: i, key: `line-${i}` });
    }

    const sectionLabel = (raw) => {
        const labels = {
            intro: 'Intro', outro: 'Outro', verse: 'Verse', chorus: 'Chorus',
            prechorus: 'Pre-Chorus', 'pre-chorus': 'Pre-Chorus', bridge: 'Bridge',
            hook: 'Hook', refrain: 'Refrain', rap: 'Rap', interlude: 'Interlude',
        };
        return labels[raw?.toLowerCase().replace(/\s+/g, '')] || raw;
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex flex-col text-[var(--text-main)]"
            style={{
                background: 'var(--bg-fullscreen)',
                transition: 'background 0.5s ease',
            }}
        >
            {/* Background blur from album art */}
            {currentSong.coverUrl && (
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        backgroundImage: `url(${currentSong.coverUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        filter: 'blur(80px) brightness(var(--fs-brightness)) saturate(1.8)',
                        transform: 'scale(1.2)',
                    }}
                />
            )}

            {/* Adaptive overlay on top of blur */}
            <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'var(--fs-overlay)', backdropFilter: 'blur(10px)' }} />

            {/* ── Close button ─────────────────────────────────────────── */}
            <button
                onClick={onClose}
                className="absolute top-5 left-5 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', backdropFilter: 'blur(10px)' }}
                title="Close (Esc)"
            >
                <svg className="w-4 h-4 text-[var(--text-main)]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            {/* ── Main content ─────────────────────────────────────────── */}
            <div className={`relative flex-1 flex flex-col justify-center ${isMobile ? 'px-4 pb-2 pt-14' : 'px-8 pb-4 pt-14'} overflow-hidden`}>
                <div className={`flex ${isMobile ? 'flex-col overflow-y-auto' : 'justify-center'} transition-all duration-700 ${isImmersive && mode === 'video' ? 'w-full max-w-none px-0' : 'w-full max-w-7xl px-8'} ${isMobile ? 'gap-8' : 'gap-20'} mx-auto`} style={{ maxHeight: isMobile ? 'none' : 'calc(100vh - 200px)' }}>

                    {/* ── Left: Album Art + Song Info ─────────────────────── */}
                    <div className={`flex flex-col items-start flex-shrink-0 transition-all duration-700 ${isImmersive && mode === 'video' || isMobile ? 'w-full' : 'w-[480px]'}`}>
                        <div className={`relative aspect-square shadow-2xl rounded-2xl overflow-hidden bg-[var(--bg-card)] transition-all duration-700 ${isImmersive && mode === 'video' ? 'w-full max-h-[82vh] aspect-video mx-auto' : isMobile ? 'w-full max-h-[40vh] mx-auto' : 'w-full h-[480px]'}`}>
                            <div className={`absolute inset-0 transition-opacity duration-500 ${mode === 'video' ? 'opacity-0' : 'opacity-100'}`}>
                                {currentSong.coverUrl ? (
                                    <img
                                        src={`${currentSong.coverUrl}?t=${new Date(currentSong.updatedAt || currentSong.createdAt).getTime()}`}
                                        alt={currentSong.title}
                                        className="w-full h-full object-contain transition-all duration-700 hover:scale-105"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--bg-card)' }}>
                                        <svg className="w-24 h-24 text-[var(--text-muted-2)]" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                                        </svg>
                                    </div>
                                )}
                            </div>

                            {currentSong.videoUrl && <VideoPlayer visible={mode === 'video'} />}

                            {/* Fullscreen Video Toggle Icon */}
                            {currentSong.videoUrl && mode === 'video' && (
                                <button
                                    onClick={() => setIsImmersive(!isImmersive)}
                                    className="absolute bottom-4 right-4 z-10 p-2.5 rounded-xl transition-all hover:scale-110 active:scale-90 shadow-2xl backdrop-blur-md"
                                    style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}
                                    title={isImmersive ? "Exit Immersive Mode" : "Enter Immersive Mode"}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                        {isImmersive ? (
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.515 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                                        ) : (
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                                        )}
                                    </svg>
                                </button>
                            )}

                            {isLoading && (
                                <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
                                    <div className="w-8 h-8 border-3 border-white/60 border-t-transparent rounded-full animate-spin" />
                                </div>
                            )}
                        </div>

                        <div className={`mt-6 flex items-start justify-between gap-3 px-1 ${(isImmersive && mode === 'video') || isMobile ? 'w-full' : 'w-full max-w-[480px]'}`}>
                            <div className="min-w-0 flex-1">
                                <h2 className="text-2xl font-black tracking-tight text-[var(--text-main)] truncate">{currentSong.title}</h2>
                                <p className="text-base mt-1 truncate font-medium" style={{ color: 'var(--text-muted)' }}>
                                    {currentSong.artist} {currentSong.album && ` — ${currentSong.album}`}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 mt-1">
                                {user && (
                                    <button onClick={handleLike} disabled={liking}
                                        className="transition-transform hover:scale-110 active:scale-90"
                                        style={{ color: likeState.liked ? 'var(--accent)' : 'var(--text-muted)' }}>
                                        <svg className="w-5 h-5" fill={likeState.liked ? 'currentColor' : 'none'}
                                            stroke="currentColor" strokeWidth={likeState.liked ? 0 : 1.8} viewBox="0 0 24 24">
                                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                        </svg>
                                    </button>
                                )}
                                <div className="relative" ref={menuRef}>
                                    <button onClick={() => setMenuOpen(!menuOpen)}
                                        className="transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg-card)]"
                                        style={{ color: 'var(--text-muted)' }}>
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                                        </svg>
                                    </button>
                                    {menuOpen && (
                                        <div className="absolute right-0 bottom-10 z-[110] rounded-xl overflow-hidden shadow-2xl animate-fade-in backdrop-blur-xl"
                                            style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', minWidth: 180 }}>
                                            <button onClick={() => { setMenuOpen(false); setShowPlaylist(true); }}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-[var(--text-main)] hover:bg-[var(--bg-card)]">
                                                <span className="text-base font-bold">+</span> Add to Playlist
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className={`mt-8 mb-2 ${(isImmersive && mode === 'video') || isMobile ? 'w-full' : 'w-full max-w-[480px]'}`}>
                            <input type="range" min="0" max="100" value={progress} onChange={handleSeek} className="progress-bar w-full" style={{ '--progress': `${progress}%` }} />
                            <div className="flex justify-between mt-1">
                                <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{formatTime(currentTime)}</span>
                                <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>-{formatTime(Math.max(0, duration - currentTime))}</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-center gap-7 mt-4 w-full max-w-[480px]">
                            <button onClick={toggleShuffle} className="transition-all hover:scale-110" style={{ color: shuffle ? 'var(--accent)' : 'var(--text-muted-2)' }}>
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M10.59 9.17 5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" /></svg>
                            </button>
                            <button onClick={skipPrev} className="transition-all hover:scale-110 active:scale-90" style={{ color: 'var(--text-main)' }}>
                                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" /></svg>
                            </button>
                            <button onClick={togglePlay} className="w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-xl" style={{ background: 'var(--text-main)', color: 'var(--bg-fullscreen)' }}>
                                {isPlaying ? <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg> : <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24" style={{ marginLeft: 4 }}><path d="M8 5v14l11-7z" /></svg>}
                            </button>
                            <button onClick={skipNext} className="transition-all hover:scale-110 active:scale-90" style={{ color: 'var(--text-main)' }}>
                                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2z" /></svg>
                            </button>
                            <button onClick={cycleLoop} className="transition-all hover:scale-110 relative" style={{ color: loop !== 'none' ? 'var(--accent)' : 'var(--text-muted-2)' }}>
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" /></svg>
                                {loop === 'one' && <span className="absolute -top-1 -right-1 text-[8px] font-bold bg-[var(--accent)] text-white w-3 h-3 rounded-full flex items-center justify-center">1</span>}
                            </button>
                        </div>

                        <div className="flex items-center justify-center gap-4 mt-10 w-full max-w-[480px]">
                            <div className="flex items-center gap-4 w-full max-w-[280px]">
                                <button onClick={() => setIsMuted(!isMuted)} className="transition-colors flex-shrink-0 text-[var(--text-muted)] hover:text-[var(--text-main)]">
                                    {isMuted || volume === 0 ? <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" /></svg> : <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg>}
                                </button>
                                <input type="range" min="0" max="1" step="0.01" value={isMuted ? 0 : volume} onChange={handleVolume} className="vol-slider flex-1" style={{ '--progress': `${(isMuted ? 0 : volume) * 100}%` }} />
                            </div>
                        </div>
                    </div>

                    {/* ── Right: Lyrics Header + Content ───────────────────── */}
                    <div className={`flex-1 min-w-0 flex flex-col relative transition-all duration-700 ${isImmersive && mode === 'video' ? 'hidden' : ''} ${isMobile ? 'h-auto mt-4' : 'h-full'}`} style={{ maxHeight: isMobile ? 'none' : 'calc(100vh - 200px)' }}>
                        <div className={`flex items-center gap-6 mb-4 px-0 flex-shrink-0 ${isMobile ? 'overflow-x-auto no-scrollbar' : ''}`}>
                            {/* Left: Tabs */}
                            <div className="flex gap-6 items-center flex-shrink-0">
                                {[
                                    { key: 'lyrics', label: 'Lyrics' },
                                    currentSong.videoUrl && { key: 'video', label: 'Video' },
                                    { key: 'info', label: 'Info' }
                                ].filter(Boolean).map(t => (
                                    <button
                                        key={t.key}
                                        onClick={() => {
                                            setActiveTab(t.key);
                                            if (t.key === 'video') setMode('video');
                                            else if (mode === 'video') setMode('audio');
                                        }}
                                        className="text-[10px] font-bold uppercase tracking-[0.2em] transition-all"
                                        style={(activeTab === t.key || (t.key === 'video' && mode === 'video')) ? { color: 'var(--accent)' } : { color: 'var(--text-muted-2)' }}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>

                            {/* Center: Lyrics Mode Toggle */}
                            {activeTab === 'lyrics' && !searchMode && !editMode && (
                                <div className="flex bg-[var(--bg-card)] rounded-full p-0.5 border border-[var(--border-light)] flex-shrink-0">
                                    <button
                                        onClick={() => setLyricsViewMode('synced')}
                                        className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all ${lyricsViewMode === 'synced' ? 'bg-[var(--accent)] text-white shadow-lg' : 'text-[var(--text-muted-2)] hover:text-[var(--text-main)]'}`}
                                    >
                                        Synced
                                    </button>
                                    <button
                                        onClick={() => setLyricsViewMode('full')}
                                        className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all ${lyricsViewMode === 'full' ? 'bg-[var(--accent)] text-white shadow-lg' : 'text-[var(--text-muted-2)] hover:text-[var(--text-main)]'}`}
                                    >
                                        Full
                                    </button>
                                </div>
                            )}

                            <div className="flex-1" />

                            {/* Right: More Menu */}
                            <div className="relative" ref={lyricsMenuRef}>
                                <button
                                    onClick={() => setLyricsMenuOpen(!lyricsMenuOpen)}
                                    className="transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg-card)]"
                                    style={{ color: 'var(--text-muted)' }}
                                >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                                    </svg>
                                </button>
                                {lyricsMenuOpen && (
                                    <div className="absolute right-0 top-full mt-1 z-[110] rounded-xl overflow-hidden shadow-2xl animate-fade-in backdrop-blur-xl"
                                        style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', minWidth: 160 }}>
                                        <button onClick={() => { setLyricsMenuOpen(false); handleSearch(); }}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold transition-colors text-[var(--text-main)] hover:bg-[var(--bg-card)]">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                            Genius Search
                                        </button>
                                        <button onClick={handleEditStart}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold transition-colors text-[var(--text-main)] hover:bg-[var(--bg-card)]">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            Edit Lyrics
                                        </button>
                                        <button onClick={() => { setLyricsMenuOpen(false); handleSyncAI(); }}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold transition-colors text-[var(--text-main)] hover:bg-[var(--bg-card)]">
                                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg>
                                            Sync AI
                                        </button>
                                        <button onClick={() => { setLyricsMenuOpen(false); setImportMode(true); setImportText(''); }}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold transition-colors text-[var(--text-main)] hover:bg-[var(--bg-card)]">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                            Import LRC
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col">
                            {activeTab === 'info' ? (
                                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar">
                                    {[
                                        { label: 'Title', value: currentSong.title },
                                        { label: 'Artist', value: currentSong.artist },
                                        currentSong.album && { label: 'Album', value: currentSong.album },
                                        { label: 'Lyrics', value: currentSong.lyricsType || 'none' },
                                        { label: 'Plays', value: `${currentSong.plays || 0}` },
                                    ].filter(Boolean).map(({ label, value }) => (
                                        <div key={label} className="border-b border-[var(--border-light)] pb-3">
                                            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted-2)' }}>{label}</p>
                                            <p className="mt-1 text-base font-semibold" style={{ color: 'var(--text-muted)' }}>{value}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : searchMode ? (
                                <div className="flex-1 overflow-hidden flex flex-col px-6">
                                    <div className="flex items-center justify-between mb-3 flex-shrink-0">
                                        <p className="text-[10px] font-bold text-[#ff9f0a] uppercase tracking-widest">
                                            {isFallback ? 'Suggestions...' : 'Searching Genius...'}
                                        </p>
                                        <button onClick={() => setSearchMode(false)} className="text-xs transition-colors" style={{ color: 'var(--text-muted-2)' }}>Cancel</button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                                        {searching && <p className="text-sm py-4 italic" style={{ color: 'var(--text-muted-2)' }}>Searching...</p>}
                                        {error && <p className="text-sm text-[#ff453a] py-4">{typeof error === 'string' ? error : (error?.message || JSON.stringify(error))}</p>}
                                        {!previewLyrics ? (
                                            <div className="space-y-3">
                                                {searchResults.map(res => (
                                                    <button key={res.url} onClick={() => handleScrape(res)} className="w-full text-left p-3 rounded-xl transition-all group" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
                                                        <div className="flex gap-3">
                                                            <img src={res.image} className="w-12 h-12 rounded-lg object-cover" alt="" />
                                                            <div className="min-w-0"><p className="text-sm font-semibold truncate group-hover:text-apple-red text-[var(--text-main)]">{res.title}</p><p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{res.artist}</p></div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col h-full pb-4">
                                                <div className="flex-1 rounded-xl p-4 font-mono text-xs leading-relaxed overflow-y-auto mb-4" style={{ background: 'var(--bg-body)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}>{previewLyrics}</div>
                                                <div className="flex gap-2">
                                                    <button onClick={handleSaveLyrics} disabled={savingLyrics} className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-lg" style={{ background: 'linear-gradient(135deg, #fc3c44, #ff6b6b)' }}>{savingLyrics ? 'Saving...' : 'Set as Lyrics'}</button>
                                                    <button onClick={() => setPreviewLyrics(null)} className="px-6 py-2.5 rounded-xl text-xs font-bold transition-all" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}>Back</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : editMode ? (
                                <div className="flex-1 overflow-hidden flex flex-col px-6">
                                    <div className="flex items-center justify-between mb-4 flex-shrink-0">
                                        <p className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-widest">
                                            Edit Lyrics
                                        </p>
                                        <button onClick={() => setEditMode(false)} className="text-xs transition-colors" style={{ color: 'var(--text-muted-2)' }}>Cancel</button>
                                    </div>
                                    <textarea
                                        value={editText}
                                        onChange={e => setEditText(e.target.value)}
                                        placeholder="Enter lyrics here..."
                                        className="flex-1 w-full p-6 rounded-2xl text-lg leading-relaxed outline-none transition-all font-mono mb-6"
                                        style={{
                                            background: 'var(--bg-body)',
                                            border: '1px solid var(--border-main)',
                                            color: 'var(--text-main)',
                                            resize: 'none',
                                            boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)'
                                        }}
                                    />
                                    <div className="flex gap-3 mb-4 flex-shrink-0">
                                        <button
                                            onClick={handleSaveEdit}
                                            disabled={savingLyrics}
                                            className="flex-1 py-3 rounded-2xl text-sm font-bold text-white transition-all shadow-xl"
                                            style={{
                                                background: savingLyrics ? 'var(--accent-muted)' : 'linear-gradient(135deg, #fc3c44, #ff6b6b)',
                                            }}
                                        >
                                            {savingLyrics ? '💾 Saving...' : '💾 Save & Sync'}
                                        </button>
                                    </div>
                                    {error && <p className="text-xs text-[#ff453a] text-center mb-2">{typeof error === 'string' ? error : (error?.message || JSON.stringify(error))}</p>}
                                </div>
                            ) : importMode ? (
                                <div className="flex-1 overflow-hidden flex flex-col px-6">
                                    <div className="flex items-center justify-between mb-4 flex-shrink-0">
                                        <p className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-widest">
                                            Import LRC (Timestamped)
                                        </p>
                                        <button onClick={() => setImportMode(false)} className="text-xs transition-colors" style={{ color: 'var(--text-muted-2)' }}>Cancel</button>
                                    </div>
                                    <p className="text-[10px] mb-3 leading-relaxed" style={{ color: 'var(--text-muted-2)' }}>
                                        Paste lyrics with timestamps in <code className="bg-[var(--bg-body)] px-1 rounded">[mm:ss.xx]</code> format.<br />
                                        Example: <code className="bg-[var(--bg-body)] px-1 rounded">[00:12.50] Hello world</code>
                                    </p>
                                    <textarea
                                        value={importText}
                                        onChange={e => setImportText(e.target.value)}
                                        placeholder="[00:00.00] Lyrics line 1&#10;[00:05.00] Lyrics line 2..."
                                        className="flex-1 w-full p-6 rounded-2xl text-lg leading-relaxed outline-none transition-all font-mono mb-6"
                                        style={{
                                            background: 'var(--bg-body)',
                                            border: '1px solid var(--border-main)',
                                            color: 'var(--text-main)',
                                            resize: 'none',
                                            boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)'
                                        }}
                                    />
                                    <div className="flex gap-3 mb-4 flex-shrink-0">
                                        <button
                                            onClick={handleSaveImport}
                                            disabled={savingLyrics}
                                            className="flex-1 py-3 rounded-2xl text-sm font-bold text-white transition-all shadow-xl"
                                            style={{
                                                background: savingLyrics ? 'var(--accent-muted)' : 'linear-gradient(135deg, #fc3c44, #ff6b6b)',
                                            }}
                                        >
                                            {savingLyrics ? '⌛ Parsing...' : '✨ Import & Save'}
                                        </button>
                                    </div>
                                    {error && <p className="text-xs text-[#ff453a] text-center mb-2">{typeof error === 'string' ? error : (error?.message || JSON.stringify(error))}</p>}
                                </div>
                            ) : (
                                <div className="flex-1 h-full min-w-0 flex flex-col relative overflow-hidden">
                                    {lyrics.length > 0 ? (
                                        lyricsViewMode === 'synced' ? (
                                            <div ref={lyricsRef} className="flex-1 overflow-y-auto px-0 py-4 custom-scrollbar pointer-events-auto"
                                                style={{
                                                    scrollBehavior: 'smooth',
                                                    zIndex: 5,
                                                    maskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)',
                                                    WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)'
                                                }}>
                                                <div className="h-40" />
                                                {groups.map((item) => {
                                                    if (item.type === 'section') {
                                                        return (
                                                            <div key={item.key} className="flex items-center gap-3 mt-14 mb-8">
                                                                <div className="h-px flex-1" style={{ background: 'var(--border-main)', opacity: 0.2 }} />
                                                                <span className="text-xs font-bold uppercase tracking-[0.3em] flex-shrink-0" style={{ color: 'var(--text-muted-2)', fontSize: 10, opacity: 0.3 }}>{sectionLabel(item.label)}</span>
                                                                <div className="h-px flex-1" style={{ background: 'var(--border-main)', opacity: 0.2 }} />
                                                            </div>
                                                        );
                                                    }
                                                    const { lyric, index } = item;
                                                    const distance = Math.abs(index - currentLyricIndex);
                                                    const isActive = index === currentLyricIndex;

                                                    return (
                                                        <button key={item.key} ref={isActive ? activeRef : null} onClick={() => seek(lyric.time)}
                                                            className="w-full text-left block leading-tight my-6 transition-all duration-700 origin-left"
                                                            style={{
                                                                fontSize: isActive ? (isMobile ? 28 : 40) : (isMobile ? 20 : 28),
                                                                fontWeight: isActive ? 800 : 700,
                                                                color: isActive ? 'var(--text-main)' : 'var(--text-muted-2)',
                                                                opacity: opacity,
                                                                transform: `scale(${scale})`,
                                                                filter: distance > 0 ? `blur(${Math.min(0.8, distance * 0.2)}px)` : 'none',
                                                                transition: 'all 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
                                                                cursor: 'pointer'
                                                            }}>{lyric.text}</button>
                                                    );
                                                })}
                                                <div className="h-52" />
                                            </div>
                                        ) : (
                                            <div className="flex-1 overflow-y-auto px-0 py-8 custom-scrollbar pointer-events-auto"
                                                style={{
                                                    zIndex: 5,
                                                    maskImage: 'linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)',
                                                    WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)'
                                                }}>
                                                <div className="max-w-2xl pt-10">
                                                    {reconstructedRaw.split('\n').map((line, i) => {
                                                        const isSection = line.trim().startsWith('[') && line.trim().endsWith(']');
                                                        return (
                                                            <p key={i} className={isSection ? 'text-[10px] font-bold uppercase tracking-[0.3em] mt-12 mb-6' : 'text-3xl font-bold leading-tight mb-6'}
                                                                style={{
                                                                    color: isSection ? 'var(--accent)' : 'var(--text-main)',
                                                                    opacity: isSection ? 0.6 : 0.85,
                                                                }}>
                                                                {line.trim() || '\u00A0'}
                                                            </p>
                                                        );
                                                    })}
                                                </div>
                                                <div className="h-32" />
                                            </div>
                                        )
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center gap-6">
                                            <div className="w-20 h-20 rounded-3xl flex items-center justify-center bg-[var(--bg-card)] border border-[var(--border-main)] shadow-xl">
                                                <svg className="w-10 h-10 text-[var(--border-main)]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-base font-bold" style={{ color: 'var(--text-muted)' }}>No lyrics available</p>
                                                <button onClick={handleSearch} className="mt-4 px-6 py-2 rounded-full text-xs font-bold text-white bg-[var(--accent)] hover:opacity-90 transition-all">Search Genius</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {showPlaylist && user && <PlaylistModal songId={currentSong._id} onClose={() => setShowPlaylist(false)} />}

                {/* EXIT FULLSCREEN button */}
                <button
                    onClick={onClose}
                    className="absolute bottom-10 right-10 flex items-center gap-3 px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-2xl"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)', backdropFilter: 'blur(20px)' }}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.515 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" /></svg>
                    Exit Fullscreen
                </button>
            </div>
        </div>
    );
}
