import { useState, useEffect, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { lyricsApi } from '../utils/api';

export default function LyricsPanel({
    searchMode, setSearchMode,
    editMode, setEditMode,
    searching, setSearching,
    scraping, setScraping,
    saving, setSaving,
    searchResults, setSearchResults,
    previewLyrics, setPreviewLyrics,
    selectedResult, setSelectedResult,
    isFallback, setIsFallback,
    error, setError,
    editText, setEditText,
    importMode, setImportMode,
    importText, setImportText,
    handleSearch, handleScrape, handleSave, handleSaveEdit, handleSyncAI, handleEditStart, handleSaveImport
}) {
    const { currentSong, currentLyricIndex, seek } = usePlayer();
    const activeRef = useRef(null);
    const containerRef = useRef(null);

    const [viewMode, setViewMode] = useState('synced'); // 'synced' | 'full'
    const lyrics = currentSong?.syncedLyrics || [];
    let rawLyrics = currentSong?.rawLyrics || '';
    if (!rawLyrics && lyrics.length) {
        let lines = [];
        let lastSec = null;
        lyrics.forEach(l => {
            if (l.section && l.section !== lastSec) {
                lines.push(`[${l.section}]`);
                lastSec = l.section;
            }
            lines.push(l.text || '');
        });
        rawLyrics = lines.join('\n');
    }

    // Auto-scroll active lyric to centre
    useEffect(() => {
        if (activeRef.current && containerRef.current) {
            activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [currentLyricIndex]);

    // ── No song selected ──────────────────────────────────────────────────────
    if (!currentSong) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-sm italic" style={{ color: 'var(--text-muted-2)' }}>No song selected</p>
            </div>
        );
    }

    // ── Search / Edit mode / Import mode / No lyrics ──────────────────────────
    if (!lyrics.length || searchMode || editMode || importMode) {
        return (
            <div className="h-full overflow-y-auto px-5 pb-8 custom-scrollbar">
                <div className="pt-6">
                    {/* Import mode — manual LRC pasting */}
                    {importMode ? (
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--accent)' }}>
                                Import LRC (Timestamped)
                            </p>
                            <p className="text-[10px] mb-3 leading-relaxed" style={{ color: 'var(--text-muted-2)' }}>
                                Paste lyrics with timestamps in <code className="bg-[var(--bg-body)] px-1 rounded">[mm:ss.xx]</code> format.
                            </p>
                            <textarea
                                value={importText}
                                onChange={e => setImportText(e.target.value)}
                                placeholder="[00:00.00] Lyrics line 1&#10;[00:05.00] Lyrics line 2..."
                                className="w-full h-[50vh] p-4 rounded-xl text-xs leading-relaxed outline-none focus:ring-1 focus:ring-accent/30 transition-all font-mono"
                                style={{
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--border-main)',
                                    color: 'var(--text-main)',
                                    resize: 'none'
                                }}
                            />
                            <div className="flex gap-2 mt-4">
                                <button
                                    onClick={handleSaveImport}
                                    disabled={saving}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-lg"
                                    style={{
                                        background: saving ? 'var(--accent-muted)' : 'linear-gradient(135deg, #fc3c44, #ff6b6b)',
                                        opacity: saving ? 0.7 : 1
                                    }}
                                >
                                    {saving ? '⚙️ Parsing...' : '✨ Import & Save'}
                                </button>
                                <button
                                    onClick={() => setImportMode(false)}
                                    className="px-6 py-2.5 rounded-xl text-sm font-medium transition-all"
                                    style={{
                                        background: 'var(--bg-card)',
                                        color: 'var(--text-muted)',
                                        border: '1px solid var(--border-main)'
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                            {error && <p className="mt-3 text-xs text-center" style={{ color: '#ff453a' }}>{error}</p>}
                        </div>
                    ) : editMode ? (
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--accent)' }}>
                                Edit Lyrics
                            </p>

                            <textarea
                                value={editText}
                                onChange={e => setEditText(e.target.value)}
                                placeholder="Enter lyrics here..."
                                className="w-full h-[60vh] p-4 rounded-xl text-sm leading-relaxed outline-none focus:ring-1 focus:ring-accent/30 transition-all font-mono"
                                style={{
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--border-main)',
                                    color: 'var(--text-main)',
                                    resize: 'none'
                                }}
                            />

                            <div className="flex gap-2 mt-4">
                                <button
                                    onClick={handleSaveEdit}
                                    disabled={saving}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-lg"
                                    style={{
                                        background: saving ? 'var(--accent-muted)' : 'linear-gradient(135deg, #fc3c44, #ff6b6b)',
                                        opacity: saving ? 0.7 : 1
                                    }}
                                >
                                    {saving ? '💾 Saving…' : '💾 Save & Sync'}
                                </button>
                                <button
                                    onClick={() => setEditMode(false)}
                                    className="px-6 py-2.5 rounded-xl text-sm font-medium transition-all"
                                    style={{
                                        background: 'var(--bg-card)',
                                        color: 'var(--text-muted)',
                                        border: '1px solid var(--border-main)'
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>

                            {error && (
                                <p className="mt-3 text-xs text-center" style={{ color: '#ff453a' }}>{error}</p>
                            )}
                        </div>
                    ) : previewLyrics ? (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
                                        Preview from Genius
                                    </p>
                                    {selectedResult && (
                                        <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-muted)' }}>
                                            {selectedResult.title} — {selectedResult.artist}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-2 mb-4">
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex-1 py-2 rounded-xl text-sm font-semibold text-white transition-all shadow-lg"
                                    style={{
                                        background: saving ? 'var(--accent-muted)' : 'linear-gradient(135deg, #fc3c44, #ff6b6b)',
                                        cursor: saving ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {saving ? '💾 Saving…' : '💾 Save Lyrics'}
                                </button>
                                <button
                                    onClick={() => { setPreviewLyrics(null); setSelectedResult(null); }}
                                    className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                                    style={{
                                        background: 'var(--bg-card)',
                                        color: 'var(--text-muted)',
                                        border: '1px solid var(--border-main)'
                                    }}
                                >
                                    ← Back
                                </button>
                            </div>

                            {/* Lyrics preview */}
                            <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)' }}>
                                {previewLyrics.split('\n').map((line, i) => {
                                    const isSection = line.startsWith('[') && line.endsWith(']');
                                    return (
                                        <p key={i} className={isSection ? 'mt-4 mb-1' : 'my-0.5'}
                                            style={{
                                                fontSize: isSection ? 10 : 13,
                                                fontWeight: isSection ? 700 : 400,
                                                color: isSection ? 'var(--accent)' : 'var(--text-main)',
                                                opacity: isSection ? 0.8 : 0.85,
                                                letterSpacing: isSection ? '0.1em' : 'normal',
                                                textTransform: isSection ? 'uppercase' : 'none',
                                                lineHeight: line.trim() === '' ? '1.5em' : '1.6',
                                            }}
                                        >
                                            {line.trim() || '\u00A0'}
                                        </p>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        /* Search UI */
                        <div>
                            {/* Empty state with search prompt */}
                            {!searchResults.length && !searching && (
                                <div className="flex flex-col items-center text-center gap-4 pt-8">
                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                                        style={{ background: 'var(--accent-muted)', border: '1px solid var(--accent-muted)' }}>
                                        <svg className="w-6 h-6" fill="none" stroke="var(--accent)" strokeWidth={1.5} viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round"
                                                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                                            {lyrics.length ? 'Search for different lyrics' : 'No lyrics available'}
                                        </p>
                                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted-2)' }}>
                                            Search Genius.com for lyrics
                                        </p>
                                    </div>

                                    <button
                                        onClick={handleSearch}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-lg"
                                        style={{
                                            background: 'linear-gradient(135deg, #fc3c44, #ff6b6b)',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                                    >
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                                        </svg>
                                        Search on Genius
                                    </button>

                                    {lyrics.length > 0 && (
                                        <button
                                            onClick={() => setSearchMode(false)}
                                            className="text-xs font-medium transition-colors"
                                            style={{ color: 'var(--text-muted-2)' }}
                                        >
                                            ← Back to lyrics
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Searching spinner */}
                            {searching && (
                                <div className="flex flex-col items-center gap-3 pt-12">
                                    <div className="w-8 h-8 border-2 rounded-full animate-spin"
                                        style={{ borderColor: 'var(--border-main)', borderTopColor: 'var(--accent)' }} />
                                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Searching Genius…</p>
                                </div>
                            )}

                            {/* Search results */}
                            {searchResults.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider mb-3"
                                        style={{ color: isFallback ? '#ff9f0a' : 'var(--accent)' }}>
                                        {isFallback ? 'Suggestions from Genius' : 'Results from Genius'}
                                    </p>
                                    <div className="space-y-2">
                                        {searchResults.map((r) => (
                                            <button
                                                key={r.id}
                                                onClick={() => handleScrape(r)}
                                                disabled={scraping}
                                                className="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group"
                                                style={{
                                                    background: 'var(--bg-card)',
                                                    border: '1px solid var(--border-main)'
                                                }}
                                                onMouseEnter={e => {
                                                    e.currentTarget.style.background = 'var(--accent-muted)';
                                                    e.currentTarget.style.borderColor = 'var(--accent-muted)';
                                                }}
                                                onMouseLeave={e => {
                                                    e.currentTarget.style.background = 'var(--bg-card)';
                                                    e.currentTarget.style.borderColor = 'var(--border-main)';
                                                }}
                                            >
                                                {r.thumbnail ? (
                                                    <img src={r.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)' }}>
                                                        <svg className="w-4 h-4 text-[var(--text-muted-2)]" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                                                        </svg>
                                                    </div>
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium text-[var(--text-main)] truncate group-hover:text-apple-red">{r.title}</p>
                                                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{r.artist}</p>
                                                </div>
                                                <svg className="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    fill="none" stroke="var(--accent)" strokeWidth={2} viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                                </svg>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Scraping indicator */}
                                    {scraping && (
                                        <div className="flex items-center gap-2 justify-center mt-4">
                                            <div className="w-4 h-4 border-2 rounded-full animate-spin"
                                                style={{ borderColor: 'var(--border-main)', borderTopColor: 'var(--accent)' }} />
                                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Scraping lyrics…</p>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => { setSearchResults([]); setError(''); }}
                                        className="w-full mt-3 text-xs font-medium text-center py-2 transition-colors"
                                        style={{ color: 'var(--text-muted-2)' }}
                                    >
                                        ← Search again
                                    </button>
                                </div>
                            )}

                            {/* Error */}
                            {error && (
                                <div className="mt-4 p-3 rounded-xl text-sm text-center"
                                    style={{ background: 'var(--accent-muted)', color: '#ff453a' }}>
                                    {error}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div >
        );
    }

    // ── Normal lyrics display ─────────────────────────────────────────────────
    // Group consecutive lyrics into sections for rendering
    const groups = [];
    let lastSection = null;
    for (let i = 0; i < lyrics.length; i++) {
        const sec = lyrics[i].section || null;
        if (sec && sec !== lastSection) {
            groups.push({ type: 'section', label: sec, key: `sec-${i}` });
            lastSection = sec;
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
        <div className="h-full flex flex-col overflow-hidden">
            {/* Lyrics View Toggle (only if synced lyrics exist) */}
            {lyrics.length > 0 && !searchMode && !editMode && (
                <div className="flex-shrink-0 px-5 pt-3 flex justify-end">
                    <div className="flex p-0.5 rounded-lg" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)' }}>
                        {['synced', 'full'].map(m => (
                            <button
                                key={m}
                                onClick={() => setViewMode(m)}
                                className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${viewMode === m ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--text-muted-2)] hover:text-[var(--text-main)]'}`}
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Scrollable lyrics */}
            <div
                ref={containerRef}
                className="flex-1 overflow-y-auto px-5 pb-8 custom-scrollbar relative"
                style={{
                    scrollBehavior: 'smooth',
                    maskImage: viewMode === 'synced' ? 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)' : 'none',
                    WebkitMaskImage: viewMode === 'synced' ? 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)' : 'none'
                }}
            >
                {viewMode === 'synced' ? (
                    <>
                        <div className="h-20" />
                        {groups.map((item) => {
                            if (item.type === 'section') {
                                return (
                                    <div key={item.key} className="flex items-center gap-2 mt-8 mb-4">
                                        <div className="h-px flex-1" style={{ background: 'var(--accent-muted)', opacity: 0.3 }} />
                                        <span className="text-xs font-semibold uppercase tracking-widest flex-shrink-0"
                                            style={{ color: 'var(--accent)', opacity: 0.4, fontSize: 8 }}>
                                            {sectionLabel(item.label)}
                                        </span>
                                        <div className="h-px flex-1" style={{ background: 'var(--accent-muted)', opacity: 0.3 }} />
                                    </div>
                                );
                            }

                            const { lyric, index } = item;
                            const distance = Math.abs(index - currentLyricIndex);
                            const isActive = index === currentLyricIndex;

                            const opacity = isActive ? 1 : 0.4;
                            const scale = isActive ? 1.05 : 0.98;

                            return (
                                <button
                                    key={item.key}
                                    ref={isActive ? activeRef : null}
                                    onClick={() => seek(lyric.time)}
                                    className="w-full text-left block transition-all duration-700 origin-left"
                                    style={{
                                        padding: '10px 0',
                                        fontSize: isActive ? '26px' : '20px',
                                        fontWeight: isActive ? 800 : 700,
                                        color: isActive ? 'var(--text-main)' : 'var(--text-muted-2)',
                                        opacity: opacity,
                                        transform: `scale(${scale}) ${isActive ? 'translateX(4px)' : ''}`,
                                        filter: isActive ? 'none' : 'blur(0.5px)',
                                        transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                                        textShadow: isActive ? '0 0 30px var(--accent-muted)' : 'none',
                                        cursor: 'pointer',
                                        lineHeight: '1.2'
                                    }}
                                >
                                    {lyric.text}
                                </button>
                            );
                        })}
                        <div className="h-32" />
                    </>
                ) : (
                    <div className="pt-6 pb-20">
                        {rawLyrics.split('\n').map((line, i) => {
                            const isSection = line.startsWith('[') && line.endsWith(']');
                            return (
                                <p key={i} className={isSection ? 'mt-6 mb-2' : 'my-1'}
                                    style={{
                                        fontSize: isSection ? 10 : 14,
                                        fontWeight: isSection ? 800 : 500,
                                        lineHeight: '1.6',
                                        color: isSection ? 'var(--accent)' : 'var(--text-main)',
                                        opacity: isSection ? 0.6 : 1,
                                        textTransform: isSection ? 'uppercase' : 'none',
                                        letterSpacing: isSection ? '0.1em' : 'normal',
                                    }}
                                >
                                    {line.trim() || '\u00A0'}
                                </p>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
