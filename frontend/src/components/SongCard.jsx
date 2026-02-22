import { useState, useRef, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { songApi } from '../utils/api';
import { formatTime } from '../utils/format';
import EditModal from './EditModal';
import PlaylistModal from './PlaylistModal';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function SongCard({
    id,
    song: initialSong,
    songs,
    index,
    onDelete,
    onUpdate,
    showReorder,
    onMoveUp,
    onMoveDown,
    isFirst,
    isLast,
    isSortable,
    onRemoveFromPlaylist,
    isPlaylistView
}) {
    const { playSong, currentSong, updateSongMetadata, isPlaying, setMode, setShowFullscreen } = usePlayer();
    const { user } = useAuth();
    const [song, setSong] = useState(initialSong);
    const [menuOpen, setMenuOpen] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [showPlaylist, setShowPlaylist] = useState(false);
    const [editTab, setEditTab] = useState('info');
    const [liking, setLiking] = useState(false);
    const menuRef = useRef(null);
    const isActive = currentSong?._id === song._id;

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: id || song._id, disabled: !isSortable });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
        position: 'relative'
    };

    // Sync if parent updates the song
    useEffect(() => { setSong(initialSong); }, [initialSong]);

    // Close menu on outside click
    useEffect(() => {
        if (!menuOpen) return;
        const handler = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [menuOpen]);

    const handlePlay = () => playSong(song, songs, index);

    const handleLike = async (e) => {
        e.stopPropagation();
        if (!user) return;
        setLiking(true);
        try {
            const data = await songApi.like(song._id);
            const updated = { ...song, isLiked: data.liked, likes: data.likes };
            setSong(updated);
            if (onUpdate) onUpdate(updated);
            updateSongMetadata(updated);
        } catch { }
        setLiking(false);
    };

    const handleSaved = (updated) => {
        setSong(updated);
        if (onUpdate) onUpdate(updated);
        updateSongMetadata(updated);
    };

    return (
        <>
            <div
                ref={setNodeRef}
                style={style}
                className={`song-row group ${isActive ? 'active' : ''} ${isDragging ? 'opacity-50 ring-2 ring-[var(--accent)] ring-inset rounded-lg bg-[var(--bg-card)]' : ''}`}
                onClick={handlePlay}
            >
                {/* Drag Handle or Index */}
                {isSortable ? (
                    <div
                        {...attributes}
                        {...listeners}
                        className="w-6 h-full flex items-center justify-center cursor-grab active:cursor-grabbing text-[var(--text-muted-2)] hover:text-[var(--text-main)] transition-colors"
                        onClick={e => e.stopPropagation()}
                    >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm6-8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
                        </svg>
                    </div>
                ) : (
                    <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                        {isActive && isPlaying ? (
                            <div className="flex gap-0.5 items-end h-3">
                                <div className="w-0.5 bg-[var(--accent)] animate-[bounce_1s_infinite]" />
                                <div className="w-0.5 bg-[var(--accent)] animate-[bounce_0.8s_infinite]" style={{ animationDelay: '0.1s' }} />
                                <div className="w-0.5 bg-[var(--accent)] animate-[bounce_1.2s_infinite]" style={{ animationDelay: '0.2s' }} />
                            </div>
                        ) : (
                            <span className="text-[10px] font-bold text-[var(--text-muted-2)] group-hover:hidden">{index + 1}</span>
                        )}
                        <svg className="w-3.5 h-3.5 text-[var(--text-main)] hidden group-hover:block" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    </div>
                )}

                {/* Cover Art */}
                <div className="w-10 h-10 rounded-md flex-shrink-0 overflow-hidden">
                    {song.coverUrl
                        ? <img src={`${song.coverUrl}?t=${new Date(song.updatedAt || song.createdAt).getTime()}`} alt={song.title} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center bg-[var(--bg-card)]">
                            <svg className="w-4 h-4 text-[var(--text-muted-2)]" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                            </svg>
                        </div>
                    }
                </div>

                {/* Title and Metadata */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold truncate tracking-tight transition-colors ${isActive ? 'text-[var(--accent)]' : 'text-[var(--text-main)]'}`}>
                            {song.title}
                        </span>
                        {song.videoUrl && <span className="text-[9px] px-1 rounded bg-[var(--success-muted)] text-[var(--success)] font-black uppercase">MV</span>}
                        {song.syncedLyrics?.length > 0 && <span className="text-[9px] px-1 rounded bg-[var(--warning-muted)] text-[var(--warning)] font-black uppercase">LRC</span>}
                    </div>
                    {/* Hide artist/album on mobile for maximum symmetry */}
                </div>

                {/* Artist Desktop */}
                <div className="hidden sm:block w-32 text-xs font-semibold truncate" style={{ color: 'var(--text-muted)' }}>
                    {song.artist}
                </div>

                {/* Album Desktop */}
                <div className="hidden md:block w-28 text-xs font-semibold truncate" style={{ color: 'var(--text-muted)' }}>
                    {song.album || '—'}
                </div>

                {/* Duration */}
                <div className="w-12 text-right text-[10px] font-mono font-bold tracking-tighter" style={{ color: 'var(--text-muted-2)' }}>
                    {formatTime(song.duration)}
                </div>

                {/* Like Button */}
                {user && (
                    <button
                        onClick={handleLike}
                        disabled={liking}
                        className={`w-7 h-7 flex items-center justify-center rounded-full transition-all ${liking ? 'opacity-50' : ''}`}
                        title={song.isLiked ? 'Unlike' : 'Like'}
                    >
                        <svg className={`w-3.5 h-3.5 ${song.isLiked ? 'text-[var(--accent)]' : 'text-[var(--text-muted-2)] hover:text-[var(--text-main)]'}`}
                            fill={song.isLiked ? "currentColor" : "none"}
                            stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l8.72-8.72 1.06-1.06a5.5 5.5 0 000-7.78z" />
                        </svg>
                    </button>
                )}

                {/* Context Menu */}
                <div className="relative w-8 h-8 flex items-center justify-center" ref={menuRef}>
                    <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                        className="w-6 h-6 flex items-center justify-center rounded-lg text-[var(--text-muted-2)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)] transition-all"
                    >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
                        </svg>
                    </button>

                    {menuOpen && (
                        <div className="absolute top-full right-0 mt-2 w-48 rounded-xl shadow-2xl border border-[var(--border-light)] p-1 z-50 animate-fade-in backdrop-blur-xl"
                            style={{ background: 'var(--bg-sidebar)' }}>
                            <MenuItem
                                icon="▶"
                                label="Play Now"
                                onClick={() => { setMenuOpen(false); handlePlay(); }}
                            />
                            {song.videoUrl && (
                                <MenuItem
                                    icon="🎬"
                                    label="Watch in Fullscreen"
                                    onClick={() => {
                                        setMenuOpen(false);
                                        playSong(song, songs, index);
                                        setMode('video');
                                        setShowFullscreen(true);
                                    }}
                                />
                            )}
                            <div className="mx-2 h-px bg-[var(--border-main)] my-1" />
                            {user && (
                                <MenuItem
                                    icon="♥"
                                    label={song.isLiked ? 'Unlike' : 'Like'}
                                    onClick={() => { setMenuOpen(false); handleLike({ stopPropagation: () => { } }); }}
                                />
                            )}
                            <MenuItem
                                icon="+"
                                label="Add to Playlist"
                                onClick={() => { setMenuOpen(false); setShowPlaylist(true); }}
                            />
                            {user && user._id === song.owner && (
                                <>
                                    <MenuItem
                                        icon="✎"
                                        label="Edit Details"
                                        onClick={() => { setMenuOpen(false); setEditTab('info'); setShowEdit(true); }}
                                    />
                                    <MenuItem
                                        icon="✍"
                                        label="Edit Lyrics"
                                        onClick={() => { setMenuOpen(false); setEditTab('lyrics'); setShowEdit(true); }}
                                    />
                                    <MenuItem
                                        icon="🗑"
                                        label="Delete"
                                        danger
                                        onClick={() => { setMenuOpen(false); onDelete(song._id); }}
                                    />
                                </>
                            )}
                            {isPlaylistView && onRemoveFromPlaylist && (
                                <>
                                    <div className="mx-2 h-px bg-[var(--border-main)] my-1" />
                                    <MenuItem
                                        icon="✕"
                                        label="Remove from Playlist"
                                        danger
                                        onClick={() => { setMenuOpen(false); onRemoveFromPlaylist(song._id); }}
                                    />
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {showEdit && <EditModal song={song} onClose={() => setShowEdit(false)} onSaved={handleSaved} />}
            {showPlaylist && <PlaylistModal songId={song._id} onClose={() => setShowPlaylist(false)} />}
        </>
    );
}

function MenuItem({ icon, label, onClick, danger }) {
    return (
        <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all ${danger ? 'text-[#ff453a] hover:bg-[#ff453a15]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text-main)]'}`}
        >
            <span className="w-4 flex justify-center opacity-70">{icon}</span>
            {label}
        </button>
    );
}
