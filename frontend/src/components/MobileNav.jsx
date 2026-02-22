import React from 'react';

export default function MobileNav({ activeView, setActiveView, setSelectedPlaylistId }) {
    const tabs = [
        { id: 'home', label: 'Home', icon: <HomeIcon /> },
        { id: 'search', label: 'Search', icon: <SearchIcon /> },
        { id: 'library', label: 'Library', icon: <LibraryIcon /> },
        { id: 'profile', label: 'Profile', icon: <ProfileIcon /> },
    ];

    return (
        <div
            className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around h-[var(--nav-bottom-height)] border-t border-[var(--border-main)] pb-[var(--safe-area-bottom)] px-2"
            style={{
                background: 'var(--bg-sidebar)',
                backdropFilter: 'blur(var(--glass-blur))',
                WebkitBackdropFilter: 'blur(var(--glass-blur))'
            }}
        >
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => {
                        setActiveView(tab.id);
                        if (setSelectedPlaylistId) setSelectedPlaylistId(null);
                    }}
                    className="flex flex-col items-center justify-center gap-1 w-full h-full transition-colors"
                    style={{ color: activeView === tab.id ? 'var(--accent)' : 'var(--text-muted)' }}
                >
                    <div className="w-6 h-6">{tab.icon}</div>
                    <span className="text-[10px] font-bold uppercase tracking-tight">{tab.label}</span>
                </button>
            ))}
        </div>
    );
}

const HomeIcon = () => (
    <svg fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>
);
const SearchIcon = () => (
    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
);
const LibraryIcon = () => (
    <svg fill="currentColor" viewBox="0 0 24 24"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9h-4v4h-2v-4H9V9h2V5h2v4h4v2z" /></svg>
);
const ProfileIcon = () => (
    <svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
);
