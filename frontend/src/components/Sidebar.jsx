import { useState, useEffect, useCallback } from 'react';
import { playlistApi } from '../utils/api';

const NAV = [
    {
        label: 'Discover', items: [
            { id: 'home', icon: HomeIcon, label: 'Home' },
            { id: 'new', icon: StarIcon, label: 'New' },
            { id: 'radio', icon: RadioIcon, label: 'Radio' },
        ]
    },
    {
        label: 'Library', items: [
            { id: 'library', icon: LibraryIcon, label: 'Songs' },
            { id: 'liked', icon: HeartIcon, label: 'Liked Songs' },
        ]
    }
];

export default function Sidebar({
    activeView, setActiveView,
    onSelectPlaylist, selectedPlaylistId,
    refreshKey
}) {
    const [playlists, setPlaylists] = useState([]);
    const [newName, setNewName] = useState('');
    const [creating, setCreating] = useState(false);
    const [showNewInput, setShowNewInput] = useState(false);

    const fetchPlaylists = useCallback(() => {
        playlistApi.getAll()
            .then(d => { if (d.success) setPlaylists(d.playlists); })
            .catch(() => { });
    }, []);

    useEffect(() => {
        fetchPlaylists();
    }, [refreshKey, fetchPlaylists]);

    useEffect(() => {
        window.addEventListener('playlist-renamed', fetchPlaylists);
        return () => window.removeEventListener('playlist-renamed', fetchPlaylists);
    }, [fetchPlaylists]);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newName.trim()) return;
        setCreating(true);
        try {
            const d = await playlistApi.create(newName.trim());
            if (d.success) {
                setPlaylists(p => [d.playlist, ...p]);
                setNewName('');
                setShowNewInput(false);
            }
        } catch { }
        setCreating(false);
    };

    return (
        <div className="h-full flex flex-col overflow-hidden select-none sidebar border-r border-[var(--border-main)] bg-[var(--bg-sidebar)]">

            {/* App name */}
            <div className="px-4 pt-5 pb-3 flex items-center gap-2.5 flex-shrink-0">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #fc3c44, #ff6b6b)' }}>
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                    </svg>
                </div>
                <span className="text-sm font-semibold text-[var(--text-main)] truncate">MusicCloud</span>
            </div>

            {/* Nav sections */}
            <div className="flex-1 overflow-y-auto px-2 pb-2" style={{ scrollbarWidth: 'none' }}>
                {NAV.map(section => (
                    <div key={section.label} className="mb-4">
                        <p className="px-3 py-1 text-xs font-semibold tracking-widest uppercase"
                            style={{ color: 'var(--text-muted-2)' }}>
                            {section.label}
                        </p>
                        {section.items.map(({ id, icon: Icon, label }) => (
                            <NavItem key={id} id={id} Icon={Icon} label={label}
                                active={activeView === id && !selectedPlaylistId}
                                onClick={() => setActiveView(id)}
                            />
                        ))}
                    </div>
                ))}

                {/* Playlists */}
                <div>
                    <div className="flex items-center justify-between px-3 py-1">
                        <p className="text-xs font-semibold tracking-widest uppercase"
                            style={{ color: 'var(--text-muted-2)' }}>
                            Playlists
                        </p>
                        <button
                            onClick={() => setShowNewInput(v => !v)}
                            className="w-5 h-5 flex items-center justify-center rounded transition-colors"
                            style={{ color: 'var(--text-muted)' }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                            title="New playlist"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                            </svg>
                        </button>
                    </div>

                    {/* Inline create */}
                    {showNewInput && (
                        <form onSubmit={handleCreate} className="flex gap-1 px-2 mb-2">
                            <input
                                type="text"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                placeholder="Playlist name"
                                maxLength={60}
                                autoFocus
                                className="flex-1 rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-main)] outline-none"
                                style={{
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--border-light)'
                                }}
                            />
                            <button type="submit" disabled={creating}
                                className="px-2 py-1 rounded-lg text-xs font-medium text-white flex-shrink-0"
                                style={{ background: 'var(--accent)' }}>
                                {creating ? '…' : '+'}
                            </button>
                        </form>
                    )}

                    {playlists.map(pl => (
                        <button key={pl._id}
                            onClick={() => onSelectPlaylist(pl._id)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all group"
                            style={{
                                background: selectedPlaylistId === pl._id
                                    ? 'var(--accent-muted)'
                                    : 'transparent',
                            }}
                            onMouseEnter={e => { if (selectedPlaylistId !== pl._id) e.currentTarget.style.background = 'var(--bg-card)'; }}
                            onMouseLeave={e => { if (selectedPlaylistId !== pl._id) e.currentTarget.style.background = 'transparent'; }}
                        >
                            <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden"
                                style={{
                                    background: selectedPlaylistId === pl._id
                                        ? 'var(--accent)'
                                        : 'var(--bg-card)'
                                }}>
                                {pl.songs?.[0]?.coverUrl
                                    ? <img src={pl.songs[0].coverUrl} alt="" className="w-full h-full object-cover" />
                                    : <svg className="w-3.5 h-3.5" fill="currentColor"
                                        style={{ color: selectedPlaylistId === pl._id ? 'white' : 'var(--text-muted)' }}
                                        viewBox="0 0 24 24">
                                        <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
                                    </svg>
                                }
                            </div>
                            <span className="text-xs truncate font-medium"
                                style={{ color: selectedPlaylistId === pl._id ? 'var(--accent)' : 'var(--text-main)' }}>
                                {pl.name}
                            </span>
                        </button>
                    ))}

                    {playlists.length === 0 && (
                        <p className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted-2)' }}>
                            No playlists yet
                        </p>
                    )}
                </div>
            </div>

        </div>
    );
}

// ── Nav item ───────────────────────────────────────────────────────────────────
function NavItem({ id, Icon, label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all"
            style={{
                background: active ? 'rgba(252,60,68,0.14)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text-muted)',
            }}
            onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.color = 'var(--text-main)'; } }}
            onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; } }}
        >
            <Icon size={16} />
            <span className="text-sm font-medium truncate">{label}</span>
        </button>
    );
}

// ── Icons ──────────────────────────────────────────────────────────────────────
function HomeIcon({ size = 16 }) {
    return <svg width={size} height={size} fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>;
}
function StarIcon({ size = 16 }) {
    return <svg width={size} height={size} fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>;
}
function RadioIcon({ size = 16 }) {
    return <svg width={size} height={size} fill="currentColor" viewBox="0 0 24 24"><path d="M20 10.54V8l-4.36-3.99L4 12.65V22h16v-9.65l-2 1.19V10.54zM10 19H7v-2h3v2zm4 0h-3v-2h3v2zm4 0h-3v-2h3v2zM4 11.17l11.64-7.99L18 5.54v.01l-14 8.48v-2.86z" /></svg>;
}
function LibraryIcon({ size = 16 }) {
    return <svg width={size} height={size} fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg>;
}
function HeartIcon({ size = 16 }) {
    return <svg width={size} height={size} fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>;
}
