import { useState, useEffect, useCallback } from 'react';
import { playlistApi } from '../utils/api';

/**
 * PlaylistModal — shown when user clicks "Add to Playlist" from ··· menu or after upload.
 * Props:
 *   songId      — the song to add
 *   onClose     — callback to close
 *   onDone      — optional callback after adding succeeds
 */
export default function PlaylistModal({ songId, onClose, onDone }) {
    const [playlists, setPlaylists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newName, setNewName] = useState('');
    const [creating, setCreating] = useState(false);
    const [addingId, setAddingId] = useState(null);
    const [successId, setSuccessId] = useState(null);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        try {
            const data = await playlistApi.getAll();
            if (data.success) setPlaylists(data.playlists);
        } catch {
            setError('Failed to load playlists');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleAdd = async (playlistId) => {
        if (addingId) return;
        setAddingId(playlistId);
        try {
            await playlistApi.addSong(playlistId, songId);
            setSuccessId(playlistId);
            setTimeout(() => setSuccessId(null), 2000);
            if (onDone) onDone();
        } catch (err) {
            setError(err.response?.data?.error || 'Error adding song');
        } finally {
            setAddingId(null);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newName.trim()) return;
        setCreating(true);
        try {
            const data = await playlistApi.create(newName.trim());
            if (data.success) {
                setPlaylists(p => [data.playlist, ...p]);
                setNewName('');
                // Auto-add the song to the new playlist
                if (songId) await handleAdd(data.playlist._id);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Error creating playlist');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            onClick={e => e.target === e.currentTarget && onClose()}>

            <div className="w-full max-w-sm rounded-2xl p-5 shadow-2xl animate-fade-in"
                style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)' }}>

                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-[var(--text-main)] text-base">Add to Playlist</h2>
                    <button onClick={onClose}
                        className="w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:bg-[var(--bg-card)]"
                        style={{ color: 'var(--text-muted)' }}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Create new */}
                <form onSubmit={handleCreate} className="flex gap-2 mb-4">
                    <input type="text" value={newName}
                        onChange={e => setNewName(e.target.value)}
                        placeholder="New playlist name…"
                        maxLength={60}
                        className="flex-1 rounded-xl px-3 py-2 text-sm text-[var(--text-main)] outline-none transition-all placeholder:text-[var(--text-muted-2)]"
                        style={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-main)'
                        }}
                        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                        onBlur={e => e.target.style.borderColor = 'var(--border-main)'}
                    />
                    <button type="submit" disabled={creating || !newName.trim()}
                        className="px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all flex-shrink-0 shadow-lg"
                        style={{ background: newName.trim() ? 'var(--accent)' : 'var(--accent-muted)', opacity: newName.trim() ? 1 : 0.6 }}>
                        {creating ? '…' : 'Create'}
                    </button>
                </form>

                {/* Playlist list */}
                {error && <p className="text-xs mb-3 text-center" style={{ color: '#ff453a' }}>{typeof error === 'string' ? error : (error?.message || JSON.stringify(error))}</p>}

                <div className="space-y-1 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                    {loading ? (
                        <div className="py-8 flex justify-center">
                            <div className="w-5 h-5 border-2 rounded-full animate-spin"
                                style={{ borderColor: 'var(--border-main)', borderTopColor: 'var(--accent)' }} />
                        </div>
                    ) : playlists.length === 0 ? (
                        <p className="text-center py-6 text-sm" style={{ color: 'var(--text-muted-2)' }}>
                            No playlists yet. Create one above!
                        </p>
                    ) : playlists.map(pl => (
                        <button key={pl._id}
                            onClick={() => handleAdd(pl._id)}
                            disabled={addingId === pl._id}
                            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all group"
                            style={{ background: 'var(--bg-card)', border: '1px solid transparent' }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'var(--accent-muted)';
                                e.currentTarget.style.borderColor = 'var(--accent-muted)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'var(--bg-card)';
                                e.currentTarget.style.borderColor = 'transparent';
                            }}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                {/* Mini cover stack */}
                                <div className="w-9 h-9 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center"
                                    style={{ background: 'var(--accent-muted)' }}>
                                    {pl.songs?.[0]?.coverUrl
                                        ? <img src={pl.songs[0].coverUrl} alt="" className="w-full h-full object-cover" />
                                        : <svg className="w-4 h-4" fill="currentColor" style={{ color: 'var(--accent)' }} viewBox="0 0 24 24">
                                            <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
                                        </svg>
                                    }
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-[var(--text-main)] truncate group-hover:text-apple-red">{pl.name}</p>
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                        {pl.songs?.length || 0} songs
                                    </p>
                                </div>
                            </div>
                            <div className="flex-shrink-0 ml-2">
                                {successId === pl._id ? (
                                    <svg className="w-5 h-5" fill="currentColor" style={{ color: '#30d158' }} viewBox="0 0 24 24">
                                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                    </svg>
                                ) : addingId === pl._id ? (
                                    <div className="w-4 h-4 border-2 rounded-full animate-spin"
                                        style={{ borderColor: 'var(--border-main)', borderTopColor: 'var(--accent)' }} />
                                ) : (
                                    <svg className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" style={{ color: 'var(--accent)' }} viewBox="0 0 24 24">
                                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                                    </svg>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
