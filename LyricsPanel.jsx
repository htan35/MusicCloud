import { useEffect, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';

export default function LyricsPanel() {
  const { currentSong, currentLyricIndex, seek } = usePlayer();
  const containerRef = useRef(null);
  const activeRef = useRef(null);

  const lyrics = currentSong?.syncedLyrics || [];

  // Smooth scroll to active lyric
  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      activeRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [currentLyricIndex]);

  if (!currentSong) {
    return (
      <div className="flex items-center justify-center h-full text-obsidian-600">
        <p className="font-body text-sm opacity-50">No song selected</p>
      </div>
    );
  }

  if (!lyrics.length) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="font-body text-sm text-white/30 italic">No lyrics available</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto px-6 py-8 space-y-3"
      style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)' }}
    >
      {/* Top spacer */}
      <div className="h-24" />

      {lyrics.map((line, i) => {
        const isActive = i === currentLyricIndex;
        const isPast = i < currentLyricIndex;
        const isNext = i === currentLyricIndex + 1;

        return (
          <button
            key={i}
            ref={isActive ? activeRef : null}
            onClick={() => seek(line.time)}
            className={`
              w-full text-left block font-display transition-all duration-500 cursor-pointer
              hover:text-aurora-violet leading-relaxed
              ${isActive
                ? 'lyric-active text-2xl font-bold scale-105 origin-left'
                : isPast
                  ? 'text-white/25 text-lg'
                  : isNext
                    ? 'text-white/60 text-xl'
                    : 'text-white/35 text-lg'
              }
            `}
            style={{
              transform: isActive ? 'scale(1.04) translateX(4px)' : 'none',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            {line.text}
          </button>
        );
      })}

      {/* Bottom spacer */}
      <div className="h-24" />
    </div>
  );
}
