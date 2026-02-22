import { useState, useEffect, useCallback, useMemo } from 'react';
import { songApi, playlistApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import SongCard from './SongCard';
import AlbumCard from './AlbumCard';

// DnD Kit imports
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers';

export default function Library({ activeView, selectedPlaylistId, onUpload, theme, setTheme }) {
    const { user, logout } = useAuth();
    const [songs, setSongs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [error, setError] = useState('');
    const [showThemeMenu, setShowThemeMenu] = useState(false);
    const [selectedAlbum, setSelectedAlbum] = useState(null);
    const [isEditingName, setIsEditingName] = useState(false);
    const [playlistName, setPlaylistName] = useState('');

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const fetchSongs = useCallback(async () => {
        try {
            setLoading(true);
            setError('');

            // Connectivity Check: Verify the backend is even reachable before trying to fetch data
            try {
                const ping = await fetch('/api/ping');
                if (!ping.ok) throw new Error(`API unreachable (HTTP ${ping.status})`);
            } catch (pErr) {
                setError(`Network Error: Backend is not responding. (${pErr.message})`);
                setLoading(false);
                return;
            }

            if (selectedPlaylistId) {
                // Load playlist songs
                const data = await playlistApi.getAll();
                if (data.success) {
                    const pl = data.playlists.find(p => p._id === selectedPlaylistId);
                    setSongs(pl?.songs || []);
                    setPlaylistName(pl?.name || '');
                }
            } else if (activeView === 'liked') {
                // Show liked songs only
                const data = await songApi.getAll();
                setSongs((data.songs || []).filter(s => s.isLiked));
            } else {
                const data = await songApi.getAll();
                setSongs(data.songs || []);
            }
        } catch (err) {
            const msg = err.response?.data?.error || err.message || 'Unknown error';
            setError(`Failed to load songs: ${msg}`);
            console.error('Library Load Error:', err);
        } finally {
            setLoading(false);
        }
    }, [activeView, selectedPlaylistId]);

    // Reset album view when navigation changes
    useEffect(() => {
        setSelectedAlbum(null);
    }, [activeView, selectedPlaylistId]);

    const handleMove = async (fromIdx, toIdx) => {
        if (!selectedPlaylistId || toIdx < 0 || toIdx >= songs.length) return;
        const newSongs = arrayMove(songs, fromIdx, toIdx);
        setSongs(newSongs);
        try {
            await playlistApi.reorder(selectedPlaylistId, newSongs.map(s => s._id));
        } catch {
            setSongs(songs); // revert on error
        }
    };

    const onDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            const oldIndex = songs.findIndex(s => s._id === active.id);
            const newIndex = songs.findIndex(s => s._id === over.id);
            handleMove(oldIndex, newIndex);
        }
    };

    useEffect(() => { fetchSongs(); }, [fetchSongs]);

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this song permanently?')) return;
        try {
            await songApi.delete(id);
            setSongs(prev => prev.filter(s => s._id !== id));
        } catch {
            setError('Failed to delete song');
        }
    };

    const handleUpdate = (updated) => {
        setSongs(prev => prev.map(s => s._id === updated._id ? updated : s));
    };

    const handleRemoveFromPlaylist = async (songId) => {
        if (!selectedPlaylistId) return;
        try {
            await playlistApi.removeSong(selectedPlaylistId, songId);
            setSongs(prev => prev.filter(s => s._id !== songId));
        } catch {
            setError('Failed to remove song from playlist');
        }
    };

    const handleRenamePlaylist = async (newName) => {
        if (!selectedPlaylistId || !newName.trim() || newName === playlistName) {
            setIsEditingName(false);
            return;
        }
        try {
            await playlistApi.rename(selectedPlaylistId, newName.trim());
            setPlaylistName(newName.trim());
            setIsEditingName(false);
            // We might need to refresh the sidebar, but for now we update locally
            window.dispatchEvent(new CustomEvent('playlist-renamed'));
        } catch {
            setError('Failed to rename playlist');
        }
    };

    const filtered = useMemo(() => {
        let base = songs;
        if (selectedAlbum) {
            base = songs.filter(s => s.album === selectedAlbum);
        }

        return base.filter(s =>
            !search ||
            s.title.toLowerCase().includes(search.toLowerCase()) ||
            s.artist.toLowerCase().includes(search.toLowerCase()) ||
            (s.album || '').toLowerCase().includes(search.toLowerCase())
        );
    }, [songs, selectedAlbum, search]);

    // Group songs for album grid (only compute if not viewing an album)
    const albums = useMemo(() => {
        if (selectedAlbum || selectedPlaylistId || activeView === 'liked') return [];
        const albumMap = {};
        songs.forEach(s => {
            if (!s.album) return;
            const key = s.album;
            if (!albumMap[key]) {
                albumMap[key] = { songs: [], cover: s.coverUrl, album: s.album, artist: s.artist, lastUpdated: s.updatedAt || s.createdAt };
            }
            albumMap[key].songs.push(s);
            const currentUpdated = new Date(s.updatedAt || s.createdAt);
            if (s.coverUrl && (!albumMap[key].cover || currentUpdated > new Date(albumMap[key].lastUpdated))) {
                albumMap[key].cover = s.coverUrl;
                albumMap[key].lastUpdated = s.updatedAt || s.createdAt;
            }
        });
        return Object.values(albumMap);
    }, [songs, selectedAlbum, selectedPlaylistId, activeView]);

    // View title
    const titles = {
        home: 'Home', new: 'New & Noteworthy', radio: 'Radio',
        library: 'Songs', liked: '❤ Liked Songs', playlist: 'Playlist'
    };
    let viewTitle = selectedPlaylistId ? 'Playlist' : (titles[activeView] || 'Library');
    if (selectedAlbum) viewTitle = selectedAlbum;

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 px-6 pt-5 pb-3 flex items-center gap-4 border-b border-[var(--border-main)]">
                {selectedAlbum && (
                    <button
                        onClick={() => setSelectedAlbum(null)}
                        className="p-1.5 rounded-full transition-colors hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                )}
                {selectedPlaylistId && !selectedAlbum ? (
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {isEditingName ? (
                            <input
                                type="text"
                                defaultValue={playlistName}
                                autoFocus
                                onBlur={(e) => handleRenamePlaylist(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleRenamePlaylist(e.target.value);
                                    if (e.key === 'Escape') setIsEditingName(false);
                                }}
                                className="text-xl font-black tracking-tight bg-transparent border-b-2 border-[var(--accent)] outline-none text-[var(--text-main)] w-48"
                            />
                        ) : (
                            <h1
                                className="text-xl font-black tracking-tight text-[var(--text-main)] cursor-pointer hover:text-[var(--accent)] transition-colors"
                                onClick={() => setIsEditingName(true)}
                                title="Click to rename"
                            >
                                {playlistName || 'Playlist'}
                            </h1>
                        )}
                        <button
                            onClick={() => setIsEditingName(true)}
                            className="p-1 rounded-md text-[var(--text-muted-2)] hover:text-[var(--accent)] transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                        </button>
                    </div>
                ) : (
                    <h1 className="text-xl font-black tracking-tight text-[var(--text-main)] flex-shrink-0">{viewTitle}</h1>
                )}
                <div className="relative max-w-xs w-full">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        style={{ color: 'var(--text-muted)' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search songs, artists, albums…"
                        className="w-full rounded-full pl-9 pr-4 py-1.5 text-sm text-[var(--text-main)] outline-none transition-all placeholder:text-[var(--text-muted-2)]"
                        style={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-main)'
                        }}
                        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                        onBlur={e => e.target.style.borderColor = 'var(--border-main)'}
                    />
                </div>

                <div className="flex-1" />

                <div className="flex items-center gap-3 flex-shrink-0 relative">
                    {!selectedAlbum && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowThemeMenu(!showThemeMenu)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border border-[var(--border-main)] hover:bg-[var(--bg-card)]"
                                style={{ color: 'var(--text-muted)' }}
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012-2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                </svg>
                                Theme
                            </button>

                            {showThemeMenu && (
                                <div
                                    className="absolute top-full right-8 mt-2 w-36 rounded-2xl shadow-2xl border border-[var(--border-light)] p-1 z-50 animate-fade-in"
                                    style={{ background: 'var(--bg-sidebar)', backdropFilter: 'blur(20px)' }}
                                >
                                    {['dark', 'light', 'glass'].map(m => (
                                        <button
                                            key={m}
                                            onClick={() => { setTheme(m); setShowThemeMenu(false); }}
                                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${theme === m ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text-main)]'}`}
                                        >
                                            {theme === m && '✓ '}{m}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <button onClick={onUpload}
                                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all"
                                style={{ background: 'var(--accent-muted)', color: 'var(--accent)', border: '1px solid var(--accent-muted)' }}
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                                </svg>
                                Add Song
                            </button>
                        </div>
                    )}

                    {/* Profile Section - Always at the right-most corner */}
                    <div className="relative group/profile ml-1">
                        <button
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all border-2 border-transparent hover:border-[var(--accent)] shadow-lg overflow-hidden"
                            style={{
                                background: 'var(--accent)',
                                color: '#fff',
                                boxShadow: '0 4px 12px var(--accent-muted)'
                            }}
                        >
                            {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                        </button>

                        {/* Simple hover dropdown for logout etc */}
                        <div className="absolute top-full right-0 pt-2 hidden group-hover/profile:block z-[60] animate-fade-in">
                            <div className="w-48 rounded-2xl border border-[var(--border-light)] p-1 shadow-2xl overflow-hidden"
                                style={{ background: 'var(--bg-sidebar)', backdropFilter: 'blur(20px)' }}>
                                <div className="px-3 py-2">
                                    <p className="text-[10px] font-bold text-[var(--text-muted-2)] uppercase tracking-widest">Account</p>
                                    <p className="text-sm font-bold truncate text-[var(--text-main)]">{user?.username || 'User'}</p>
                                    <p className="text-[10px] text-[var(--text-muted)] truncate">{user?.email || ''}</p>
                                </div>
                                <div className="h-px bg-[var(--border-main)] mx-1 my-1" />
                                <button
                                    onClick={async () => {
                                        await logout();
                                        window.location.reload();
                                    }}
                                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-[#ff453a] hover:bg-[#ff453a15] transition-all flex items-center gap-2"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 013-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 pb-6" style={{ scrollbarWidth: 'thin' }}>
                {error && (
                    <div className="mt-4 p-3 rounded-xl text-sm" style={{ background: 'rgba(255,69,58,0.1)', color: '#ff453a' }}>
                        {typeof error === 'string' ? error : (error?.message || JSON.stringify(error))}
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="w-8 h-8 border-2 rounded-full animate-spin"
                            style={{ borderColor: 'var(--border-main)', borderTopColor: 'var(--accent)' }} />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center py-16 gap-3">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-[var(--bg-card)] border border-[var(--border-main)] shadow-inner">
                            <svg className="w-8 h-8 text-[var(--text-muted-2)]" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                            </svg>
                        </div>
                        <p className="text-[var(--text-muted)] text-sm font-medium">
                            {activeView === 'liked' ? 'No liked songs yet — click ♥ on any song' : 'No songs found'}
                        </p>
                        {activeView === 'home' && (
                            <button onClick={onUpload} className="text-sm font-bold transition-colors hover:text-[var(--accent-hover)]" style={{ color: 'var(--accent)' }}>
                                Upload your first song →
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Song table header */}
                        <div className="flex items-center gap-3 px-1 mb-2 mt-4">
                            <div className="w-6" />
                            <div className="w-10" />
                            <div className="flex-1 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted-2)' }}>Title</div>
                            <div className="hidden sm:block w-32 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted-2)' }}>Artist</div>
                            {!selectedAlbum && <div className="hidden md:block w-28 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted-2)' }}>Album</div>}
                            <div className="w-12 text-right text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted-2)' }}>Time</div>
                            {user && <div className="w-7" />}
                            <div className="w-8" />
                        </div>
                        <div style={{ height: 1, background: 'var(--border-main)', marginBottom: 4 }} />

                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={onDragEnd}
                            modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
                        >
                            <SortableContext
                                items={filtered.map(s => s._id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {filtered.map((song, idx) => (
                                    <SongCard
                                        key={song._id}
                                        id={song._id}
                                        song={song}
                                        songs={filtered}
                                        index={idx}
                                        onDelete={handleDelete}
                                        onUpdate={handleUpdate}
                                        showReorder={!!selectedPlaylistId}
                                        onMoveUp={selectedPlaylistId ? () => handleMove(idx, idx - 1) : undefined}
                                        onMoveDown={selectedPlaylistId ? () => handleMove(idx, idx + 1) : undefined}
                                        isFirst={idx === 0}
                                        isLast={idx === filtered.length - 1}
                                        isSortable={!!selectedPlaylistId && !search && !selectedAlbum}
                                        onRemoveFromPlaylist={selectedPlaylistId ? handleRemoveFromPlaylist : undefined}
                                        isPlaylistView={!!selectedPlaylistId}
                                    />
                                ))}
                            </SortableContext>
                        </DndContext>

                        {/* Albums grid (only on home/library views and if not filtering/viewing album) */}
                        {!selectedPlaylistId && activeView !== 'liked' && !selectedAlbum && !search && albums.length > 0 && (
                            <>
                                <h2 className="text-lg font-black tracking-tight text-[var(--text-main)] mt-10 mb-4">Your Collection</h2>
                                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
                                    {albums.map(a => (
                                        <AlbumCard
                                            key={a.album}
                                            album={a.album}
                                            artist={a.artist}
                                            cover={a.cover ? `${a.cover}?t=${new Date(a.lastUpdated).getTime()}` : undefined}
                                            count={a.songs.length}
                                            songs={a.songs}
                                            onOpen={setSelectedAlbum}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
