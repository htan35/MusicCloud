import { usePlayer } from '../context/PlayerContext';
import { formatTime } from '../utils/format';

export default function PlayerControls({ onFullscreen, isMobile }) {
    const {
        currentSong, isPlaying, isLoading,
        currentTime, duration, volume, isMuted,
        mode, shuffle, loop,
        togglePlay, seek, skipNext, skipPrev,
        setVolume, setIsMuted, setMode,
        toggleShuffle, cycleLoop
    } = usePlayer();

    const progress = duration ? (currentTime / duration) * 100 : 0;

    const handleSeek = (e) => {
        const val = parseFloat(e.target.value);
        seek((val / 100) * duration);
    };

    const handleVolume = (e) => {
        const val = parseFloat(e.target.value);
        setVolume(val);
        if (val > 0) setIsMuted(false);
    };

    if (!currentSong) return null;

    const loopTitle = loop === 'none' ? 'Loop Off' : loop === 'all' ? 'Loop All' : 'Loop One';

    if (isMobile) {
        return (
            <div
                className="fixed left-0 right-0 z-40 px-4 pb-3 pt-3 cursor-pointer"
                onClick={onFullscreen}
                style={{
                    bottom: 'var(--nav-bottom-height)',
                    background: 'var(--bg-player)',
                    backdropFilter: 'blur(var(--glass-blur))',
                    WebkitBackdropFilter: 'blur(var(--glass-blur))',
                    borderTop: '1px solid var(--border-main)',
                }}
            >
                {/* Seek bar (Mini) */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-[var(--border-main)]">
                    <div
                        className="h-full bg-[var(--accent)]"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <img
                            src={`${currentSong.coverUrl}?t=${new Date(currentSong.updatedAt || currentSong.createdAt).getTime()}`}
                            alt={currentSong.title}
                            className="w-10 h-10 rounded-lg object-cover"
                        />
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-[var(--text-main)] truncate">{currentSong.title}</p>
                            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{currentSong.artist}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <button onClick={skipPrev} className="p-2 text-[var(--text-muted)]"><PrevIcon /></button>
                        <button
                            onClick={togglePlay}
                            className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--text-main)]"
                        >
                            {isPlaying ? <PauseIcon color="var(--bg-body)" /> : <PlayIcon color="var(--bg-body)" />}
                        </button>
                        <button onClick={skipNext} className="p-2 text-[var(--text-muted)]"><NextIcon /></button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className="w-full z-10 px-6 border-t border-[var(--border-main)]"
            style={{
                background: 'var(--bg-player)',
                backdropFilter: 'blur(var(--glass-blur))',
                WebkitBackdropFilter: 'blur(var(--glass-blur))',
            }}
        >
            {/* Seek bar */}
            <div className="flex items-center gap-3 pt-3 pb-1">
                <span className="font-mono text-[10px] w-10 text-right" style={{ color: 'var(--text-muted)' }}>
                    {formatTime(currentTime)}
                </span>
                <div className="relative flex-1">
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={progress}
                        onChange={handleSeek}
                        className="w-full progress-bar"
                        style={{ '--progress': `${progress}%` }}
                    />
                </div>
                <span className="font-mono text-[10px] w-10" style={{ color: 'var(--text-muted)' }}>
                    {formatTime(duration)}
                </span>
            </div>

            {/* Controls row */}
            <div className="flex items-center justify-between pb-3">

                {/* Left: Song info */}
                <div className="flex items-center gap-3 w-56 min-w-0 flex-shrink-0">
                    <div className="relative flex-shrink-0">
                        {currentSong.coverUrl ? (
                            <img
                                src={`${currentSong.coverUrl}?t=${new Date(currentSong.updatedAt || currentSong.createdAt).getTime()}`}
                                alt={currentSong.title}
                                className="w-11 h-11 rounded-lg object-cover"
                                style={{ boxShadow: 'var(--shadow-card)' }}
                            />
                        ) : (
                            <div className="w-11 h-11 rounded-lg flex items-center justify-center bg-[var(--bg-card)] border border-[var(--border-main)]">
                                <svg className="w-5 h-5 text-[var(--text-muted-2)]" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                                </svg>
                            </div>
                        )}
                        {isLoading && (
                            <div className="absolute inset-0 rounded-lg flex items-center justify-center" style={{ background: 'var(--fs-overlay)' }}>
                                <div className="w-4 h-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                            </div>
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-[var(--text-main)] truncate tracking-tight">{currentSong.title}</p>
                        <p className="text-xs truncate font-medium" style={{ color: 'var(--text-muted)' }}>{currentSong.artist}</p>
                    </div>
                </div>

                {/* Center: Playback */}
                <div className="flex items-center gap-4">
                    {/* Shuffle */}
                    <button onClick={toggleShuffle}
                        className="transition-colors relative"
                        style={{ color: shuffle ? 'var(--accent)' : 'var(--text-muted-2)' }}
                        onMouseEnter={e => { if (!shuffle) e.currentTarget.style.color = 'var(--text-main)'; }}
                        onMouseLeave={e => { if (!shuffle) e.currentTarget.style.color = 'var(--text-muted-2)'; }}
                        title={shuffle ? 'Shuffle On' : 'Shuffle Off'}
                    >
                        <ShuffleIcon />
                        {shuffle && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ background: 'var(--accent)' }} />}
                    </button>

                    {/* Prev */}
                    <button
                        onClick={skipPrev}
                        className="transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--text-main)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                        title="Previous"
                    >
                        <PrevIcon />
                    </button>

                    {/* Play/Pause */}
                    <button
                        onClick={togglePlay}
                        className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-lg"
                        style={{ background: 'var(--text-main)' }}
                        title={isPlaying ? 'Pause' : 'Play'}
                    >
                        {isPlaying
                            ? <PauseIcon color="var(--bg-body)" />
                            : <PlayIcon color="var(--bg-body)" />
                        }
                    </button>

                    {/* Next */}
                    <button
                        onClick={skipNext}
                        className="transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--text-main)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                        title="Next"
                    >
                        <NextIcon />
                    </button>

                    {/* Repeat / Loop */}
                    <button onClick={cycleLoop}
                        className="transition-colors relative"
                        style={{ color: loop !== 'none' ? 'var(--accent)' : 'var(--text-muted-2)' }}
                        onMouseEnter={e => { if (loop === 'none') e.currentTarget.style.color = 'var(--text-main)'; }}
                        onMouseLeave={e => { if (loop === 'none') e.currentTarget.style.color = 'var(--text-muted-2)'; }}
                        title={loopTitle}
                    >
                        {loop === 'one' ? <RepeatOneIcon /> : <RepeatIcon />}
                        {loop !== 'none' && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ background: 'var(--accent)' }} />}
                    </button>
                </div>

                {/* Right: Volume + Video toggle + Fullscreen */}
                <div className="flex items-center gap-4 w-56 justify-end flex-shrink-0">
                    {/* Video mode toggle */}
                    {currentSong.videoUrl && (
                        <button
                            onClick={() => setMode(mode === 'video' ? 'audio' : 'video')}
                            className="px-2.5 py-1 rounded-md text-xs font-bold transition-all"
                            style={mode === 'video'
                                ? { background: 'var(--accent-muted)', color: 'var(--accent)', border: '1px solid var(--accent-muted)' }
                                : { border: '1px solid var(--border-main)', color: 'var(--text-muted)' }
                            }
                        >
                            {mode === 'video' ? '🎬 Video' : '🎵 Audio'}
                        </button>
                    )}

                    {/* Volume */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsMuted(!isMuted)}
                            className="transition-colors"
                            style={{ color: 'var(--text-muted)' }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-main)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                            title={isMuted ? 'Unmute' : 'Mute'}
                        >
                            {isMuted || volume === 0 ? <MutedIcon /> : <VolumeIcon />}
                        </button>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={isMuted ? 0 : volume}
                            onChange={handleVolume}
                            className="vol-slider w-20"
                            style={{ '--progress': `${(isMuted ? 0 : volume) * 100}%` }}
                        />
                    </div>

                    {/* Fullscreen */}
                    <button
                        onClick={onFullscreen}
                        className="transition-colors"
                        style={{ color: 'var(--text-muted-2)' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--text-main)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted-2)'}
                        title="Fullscreen"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Icons ──────────────────────────────────────────────────────────────────────

const PlayIcon = ({ color = 'white' }) => (
    <svg className="w-4 h-4" fill={color} viewBox="0 0 24 24" style={{ marginLeft: 2 }}>
        <path d="M8 5v14l11-7z" />
    </svg>
);

const PauseIcon = ({ color = 'white' }) => (
    <svg className="w-4 h-4" fill={color} viewBox="0 0 24 24">
        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
);

const PrevIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
    </svg>
);

const NextIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2z" />
    </svg>
);

const ShuffleIcon = () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M10.59 9.17 5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
    </svg>
);

const RepeatIcon = () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
    </svg>
);

const RepeatOneIcon = () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z" />
    </svg>
);

const VolumeIcon = () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
);

const MutedIcon = () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
    </svg>
);
