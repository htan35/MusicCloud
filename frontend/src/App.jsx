import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import AudioEngine from './components/AudioEngine';
import Sidebar from './components/Sidebar';
import Library from './components/Library';
import NowPlaying from './components/NowPlaying';
import PlayerControls from './components/PlayerControls';
import MobileNav from './components/MobileNav';
import FullscreenPlayer from './components/FullscreenPlayer';
import UploadModal from './components/UploadModal';
import AuthPage from './pages/AuthPage';

const SIDEBAR_MIN = 180;
const SIDEBAR_MAX = 340;
const SIDEBAR_DEFAULT = 220;

const RIGHT_MIN = 240;
const RIGHT_MAX = 420;
const RIGHT_DEFAULT = 280;

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error("App Crash:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f0f10] text-white p-6 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-[#fc3c44] flex items-center justify-center mb-6 shadow-lg shadow-[#fc3c4440]">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h1 className="text-xl font-black mb-2 tracking-tight">Something went wrong</h1>
                    <p className="text-sm text-white/50 mb-8 max-w-xs">
                        {typeof this.state.error?.message === 'string'
                            ? this.state.error.message
                            : 'The application crashed unexpectedly.'}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-2.5 bg-white text-black rounded-full font-bold text-sm hover:scale-105 transition-transform"
                    >
                        Reload MusicCloud
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

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

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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

                {/* Left: Sidebar (Hidden on mobile, accessible via Bottom Nav later) */}
                {!isMobile && (
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
                )}

                {/* Center: Library */}
                <div className="flex-1 h-full overflow-hidden flex flex-col min-w-0 bg-[var(--bg-body)]">
                    <Library
                        key={`${refreshKey}-${selectedPlaylistId}`}
                        activeView={activeView}
                        setActiveView={setActiveView}
                        selectedPlaylistId={selectedPlaylistId}
                        setSelectedPlaylistId={setSelectedPlaylistId}
                        onSelectPlaylist={(id) => { setSelectedPlaylistId(id); setActiveView('playlist'); }}
                        onUpload={() => setShowUpload(true)}
                        theme={theme}
                        setTheme={setTheme}
                        isMobile={isMobile}
                        refreshKey={refreshKey}
                    />

                    {/* Bottom player bar (Desktop only, inside center column) */}
                    {!isMobile && (
                        <PlayerControls isMobile={isMobile} />
                    )}
                </div>

                {/* Right: Now Playing (Hidden on mobile) */}
                {!isMobile && (
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
                )}
            </div>

            {/* Upload modal */}
            {showUpload && (
                <UploadModal
                    onClose={() => setShowUpload(false)}
                    onSuccess={() => { setShowUpload(false); handleUploadSuccess(); }}
                />
            )}

            {showFullscreen && (
                <FullscreenPlayer
                    theme={theme}
                    onClose={() => setShowFullscreen(false)}
                    isMobile={isMobile}
                />
            )}

            {/* Mobile Bottom Navigation & Mini Player */}
            {isMobile && (
                <>
                    <PlayerControls isMobile={isMobile} />
                    <MobileNav
                        activeView={activeView}
                        setActiveView={setActiveView}
                    />
                </>
            )}

            {/* Fullscreen Player rendered last for highest Z-Index precedence */}
            {showFullscreen && (
                <FullscreenPlayer
                    theme={theme}
                    onClose={() => setShowFullscreen(false)}
                    isMobile={isMobile}
                />
            )}
        </>
    );
}

export default function App() {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <PlayerProvider>
                    <AppShell />
                </PlayerProvider>
            </AuthProvider>
        </ErrorBoundary>
    );
}
