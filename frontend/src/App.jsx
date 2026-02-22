import { useState, useRef, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import AudioEngine from './components/AudioEngine';
import Sidebar from './components/Sidebar';
import Library from './components/Library';
import NowPlaying from './components/NowPlaying';
import PlayerControls from './components/PlayerControls';
import FullscreenPlayer from './components/FullscreenPlayer';
import UploadModal from './components/UploadModal';
import AuthPage from './pages/AuthPage';

const SIDEBAR_MIN = 180;
const SIDEBAR_MAX = 340;
const SIDEBAR_DEFAULT = 220;

const RIGHT_MIN = 240;
const RIGHT_MAX = 420;
const RIGHT_DEFAULT = 280;

function AppShell() {
    const { user, loading } = useAuth();
    const { showFullscreen, setShowFullscreen } = usePlayer();

    const [activeView, setActiveView] = useState('home');
    const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
    const [showUpload, setShowUpload] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [theme, setTheme] = useState(() => localStorage.getItem('mc_theme') || 'dark');

    // Apply theme to document
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('mc_theme', theme);
    }, [theme]);

    const [sidebarWidth, setSidebarWidth] = useState(() => {
        const stored = localStorage.getItem('mc_sidebar_w');
        return stored ? parseInt(stored) : SIDEBAR_DEFAULT;
    });

    const [rightWidth, setRightWidth] = useState(() => {
        const stored = localStorage.getItem('mc_right_w');
        return stored ? parseInt(stored) : RIGHT_DEFAULT;
    });

    // ── Left/Right drag handles ──────────────────────────────────────────────
    const dragging = useRef(null);
    const startX = useRef(0);
    const startW = useRef(0);

    const onLeftMouseDown = useCallback((e) => {
        dragging.current = 'left';
        startX.current = e.clientX;
        startW.current = sidebarWidth;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }, [sidebarWidth]);

    const onRightMouseDown = useCallback((e) => {
        dragging.current = 'right';
        startX.current = e.clientX;
        startW.current = rightWidth;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }, [rightWidth]);

    useEffect(() => {
        const onMove = (e) => {
            if (!dragging.current) return;
            const delta = e.clientX - startX.current;
            if (dragging.current === 'left') {
                const newW = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, startW.current + delta));
                setSidebarWidth(newW);
            } else if (dragging.current === 'right') {
                const newW = Math.min(RIGHT_MAX, Math.max(RIGHT_MIN, startW.current - delta));
                setRightWidth(newW);
            }
        };
        const onUp = () => {
            if (!dragging.current) return;
            const side = dragging.current;
            dragging.current = null;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            if (side === 'left') {
                setSidebarWidth(w => { localStorage.setItem('mc_sidebar_w', String(w)); return w; });
            } else {
                setRightWidth(w => { localStorage.setItem('mc_right_w', String(w)); return w; });
            }
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, []);

    const handleUploadSuccess = () => setRefreshKey(k => k + 1);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-body)]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform hover:scale-105" style={{ background: 'linear-gradient(135deg, #fc3c44, #ff6b6b)' }}>
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                        </svg>
                    </div>
                    <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border-main)', borderTopColor: 'var(--accent)' }} />
                </div>
            </div>
        );
    }

    if (!user) return <AuthPage />;

    return (
        <>
            <AudioEngine />
            <div className="flex h-screen overflow-hidden bg-[var(--bg-body)] text-[var(--text-main)]">

                {/* Left: Sidebar */}
                <div className="relative flex-shrink-0 h-full" style={{ width: sidebarWidth }}>
                    <Sidebar
                        activeView={activeView}
                        setActiveView={(v) => { setActiveView(v); setSelectedPlaylistId(null); }}
                        onSelectPlaylist={(id) => { setSelectedPlaylistId(id); setActiveView('playlist'); }}
                        selectedPlaylistId={selectedPlaylistId}
                        refreshKey={refreshKey}
                    />

                    {/* Left drag handle */}
                    <div
                        onMouseDown={onLeftMouseDown}
                        className="absolute top-0 right-0 h-full w-1 cursor-col-resize z-20 group"
                        style={{ background: 'transparent' }}
                    >
                        <div className="h-full w-0.5 ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ background: 'var(--accent)' }} />
                    </div>
                </div>

                {/* Center: Library */}
                <div className="flex-1 h-full overflow-hidden flex flex-col min-w-0 bg-[var(--bg-body)]">
                    <Library
                        key={`${refreshKey}-${selectedPlaylistId}`}
                        activeView={activeView}
                        selectedPlaylistId={selectedPlaylistId}
                        onUpload={() => setShowUpload(true)}
                        theme={theme}
                        setTheme={setTheme}
                    />

                    {/* Bottom player bar (Contained in center column) */}
                    <PlayerControls onFullscreen={() => setShowFullscreen(true)} />
                </div>

                {/* Right: Now Playing (resizable) */}
                <div className="relative h-full flex-shrink-0 flex flex-col"
                    style={{ width: rightWidth, borderLeft: '1px solid var(--border-main)', background: 'var(--bg-sidebar)' }}>
                    {/* Right drag handle */}
                    <div
                        onMouseDown={onRightMouseDown}
                        className="absolute top-0 left-0 h-full w-1 cursor-col-resize z-20 group"
                        style={{ background: 'transparent' }}
                    >
                        <div className="h-full w-0.5 ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ background: 'var(--accent)' }} />
                    </div>

                    <NowPlaying onFullscreen={() => setShowFullscreen(true)} />
                </div>
            </div>

            {/* Upload modal */}
            {showUpload && (
                <UploadModal
                    onClose={() => setShowUpload(false)}
                    onSuccess={() => { setShowUpload(false); handleUploadSuccess(); }}
                />
            )}

            {/* Fullscreen Now Playing */}
            {showFullscreen && (
                <FullscreenPlayer
                    theme={theme}
                    onClose={() => setShowFullscreen(false)}
                />
            )}
        </>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <PlayerProvider>
                <AppShell />
            </PlayerProvider>
        </AuthProvider>
    );
}
