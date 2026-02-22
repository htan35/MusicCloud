import { usePlayer } from '../context/PlayerContext';
import { formatTime } from '../utils/format';

export default function PlayerControls() {
  const {
    currentSong, isPlaying, isLoading,
    currentTime, duration, volume, isMuted,
    mode,
    togglePlay, seek, skipNext, skipPrev,
    setVolume, setIsMuted, setMode
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

  return (
    <div className="glass-strong fixed bottom-0 left-0 right-0 z-50 px-6 py-4">
      {/* Progress bar */}
      <div className="mb-3 flex items-center gap-3">
        <span className="font-mono text-xs text-white/40 w-10 text-right">
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
        <span className="font-mono text-xs text-white/40 w-10">
          {formatTime(duration)}
        </span>
      </div>

      <div className="flex items-center justify-between">
        {/* Song info */}
        <div className="flex items-center gap-3 w-64 min-w-0">
          <div className="relative flex-shrink-0">
            {currentSong.coverUrl ? (
              <img
                src={currentSong.coverUrl}
                alt={currentSong.title}
                className="w-12 h-12 rounded-lg object-cover glow-violet"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-obsidian-700 flex items-center justify-center">
                <MusicIcon />
              </div>
            )}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
                <div className="w-4 h-4 border-2 border-aurora-violet border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-display font-bold text-sm text-white truncate">{currentSong.title}</p>
            <p className="font-body text-xs text-white/50 truncate">{currentSong.artist}</p>
          </div>
        </div>

        {/* Playback controls */}
        <div className="flex items-center gap-5">
          <button onClick={skipPrev} className="text-white/60 hover:text-white transition-colors">
            <PrevIcon />
          </button>

          <button
            onClick={togglePlay}
            className="w-12 h-12 rounded-full bg-gradient-to-br from-aurora-pink to-aurora-violet flex items-center justify-center glow-violet hover:scale-105 transition-transform"
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>

          <button onClick={skipNext} className="text-white/60 hover:text-white transition-colors">
            <NextIcon />
          </button>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-4 w-64 justify-end">
          {/* Video toggle */}
          {currentSong.videoUrl && (
            <button
              onClick={() => setMode(mode === 'video' ? 'audio' : 'video')}
              className={`px-3 py-1.5 rounded-full text-xs font-body font-medium transition-all ${
                mode === 'video'
                  ? 'bg-aurora-pink text-white'
                  : 'border border-white/20 text-white/60 hover:border-aurora-violet hover:text-aurora-violet'
              }`}
            >
              {mode === 'video' ? '🎬 Video' : '🎵 Audio'}
            </button>
          )}

          {/* Volume */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-white/50 hover:text-white transition-colors"
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
              className="w-24"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// SVG Icons
const PlayIcon = () => (
  <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const PauseIcon = () => (
  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
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

const MusicIcon = () => (
  <svg className="w-5 h-5 text-white/30" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
  </svg>
);
