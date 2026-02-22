import { useState, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import LyricsPanel from './LyricsPanel';
import VideoPlayer from './VideoPlayer';

export default function NowPlaying() {
  const { currentSong, mode, setMode, isPlaying } = usePlayer();
  const [tab, setTab] = useState('lyrics'); // 'lyrics' | 'info'

  // Reset tab when song changes
  useEffect(() => {
    if (currentSong) setTab('lyrics');
  }, [currentSong?._id]);

  if (!currentSong) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-center p-8">
        <div className="w-32 h-32 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
          <svg className="w-12 h-12 text-white/10" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
        </div>
        <div>
          <p className="font-display text-white/20 text-lg">Nothing playing</p>
          <p className="font-body text-white/10 text-sm mt-1">Select a song to start</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Album art / Video area */}
      <div className="relative flex-shrink-0">
        {/* Video player (absolute, overlays cover) */}
        <div className="relative aspect-square max-h-64 overflow-hidden rounded-2xl mx-4 mt-4">
          {/* Cover art */}
          <div className={`absolute inset-0 transition-opacity duration-500 ${mode === 'video' ? 'opacity-0' : 'opacity-100'}`}>
            {currentSong.coverUrl ? (
              <img
                src={currentSong.coverUrl}
                alt={currentSong.title}
                className={`w-full h-full object-cover ${isPlaying ? 'animate-[spin_20s_linear_infinite]' : ''}`}
                style={{ borderRadius: '1rem', animationPlayState: isPlaying ? 'running' : 'paused' }}
              />
            ) : (
              <div className="w-full h-full bg-obsidian-800 flex items-center justify-center">
                <svg className="w-20 h-20 text-white/10" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
              </div>
            )}
            {/* Disc center */}
            {currentSong.coverUrl && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-obsidian-950 border-2 border-obsidian-800" />
              </div>
            )}
          </div>

          {/* Video overlay */}
          {currentSong.videoUrl && (
            <VideoPlayer visible={mode === 'video'} />
          )}

          {/* Ambient glow */}
          {currentSong.coverUrl && (
            <div
              className="absolute -inset-4 -z-10 blur-3xl opacity-40"
              style={{
                backgroundImage: `url(${currentSong.coverUrl})`,
                backgroundSize: 'cover',
                filter: 'blur(40px) saturate(2)'
              }}
            />
          )}
        </div>

        {/* Mode toggle */}
        {currentSong.videoUrl && (
          <div className="flex justify-center mt-3">
            <div className="flex rounded-full overflow-hidden border border-white/10 p-0.5">
              {['audio', 'video'].map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-4 py-1.5 rounded-full text-xs font-body font-medium transition-all capitalize ${
                    mode === m
                      ? 'bg-gradient-to-r from-aurora-pink to-aurora-violet text-white'
                      : 'text-white/40 hover:text-white'
                  }`}
                >
                  {m === 'audio' ? '🎵 Audio' : '🎬 Video'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Song info */}
        <div className="px-6 pt-4 pb-2">
          <h2 className="font-display font-bold text-xl text-white truncate">{currentSong.title}</h2>
          <p className="font-body text-white/50 text-sm mt-0.5">
            {currentSong.artist}
            {currentSong.album && <span className="text-white/25"> · {currentSong.album}</span>}
          </p>
        </div>

        {/* Tabs */}
        {currentSong.syncedLyrics?.length > 0 && (
          <div className="flex px-6 gap-4 border-b border-white/5 mb-1">
            {[
              { key: 'lyrics', label: 'Lyrics' },
              { key: 'info', label: 'Info' }
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`pb-2 text-sm font-body border-b-2 transition-all -mb-px ${
                  tab === t.key
                    ? 'border-aurora-violet text-aurora-violet'
                    : 'border-transparent text-white/30 hover:text-white/60'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {tab === 'lyrics' ? (
          <LyricsPanel />
        ) : (
          <div className="p-6 space-y-3">
            <InfoRow label="Title" value={currentSong.title} />
            <InfoRow label="Artist" value={currentSong.artist} />
            {currentSong.album && <InfoRow label="Album" value={currentSong.album} />}
            <InfoRow label="Lyrics Type" value={currentSong.lyricsType || 'none'} />
            <InfoRow label="Lines" value={`${currentSong.syncedLyrics?.length || 0} synced`} />
            {currentSong.videoUrl && <InfoRow label="Video" value="Available ✓" />}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/5">
      <span className="font-body text-xs text-white/30 uppercase tracking-wider">{label}</span>
      <span className="font-body text-sm text-white/70">{value}</span>
    </div>
  );
}
