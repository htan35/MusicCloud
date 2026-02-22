import { usePlayer } from '../context/PlayerContext';
import { formatTime } from '../utils/format';

export default function SongCard({ song, songs, index, onDelete }) {
  const { playSong, currentSong, isPlaying } = usePlayer();
  const isActive = currentSong?._id === song._id;

  const handlePlay = () => {
    playSong(song, songs, index);
  };

  return (
    <div
      className={`
        group flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer
        transition-all duration-200 hover:bg-obsidian-700/50
        ${isActive ? 'bg-obsidian-700/70 border border-aurora-violet/30' : ''}
      `}
      onClick={handlePlay}
    >
      {/* Cover */}
      <div className="relative flex-shrink-0 w-12 h-12">
        {song.coverUrl ? (
          <img
            src={song.coverUrl}
            alt={song.title}
            className="w-12 h-12 rounded-lg object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-obsidian-700 flex items-center justify-center">
            <svg className="w-5 h-5 text-white/20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
          {isActive && isPlaying ? (
            <div className="flex gap-0.5 items-end h-4">
              {[1, 2, 3].map(b => (
                <div key={b} className="w-1 bg-aurora-pink rounded-full animate-bounce"
                  style={{ height: `${[60, 100, 40][b - 1]}%`, animationDelay: `${b * 0.1}s` }} />
              ))}
            </div>
          ) : (
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </div>
        {/* Playing indicator */}
        {isActive && isPlaying && (
          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-aurora-pink animate-pulse" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`font-body font-medium text-sm truncate ${isActive ? 'text-aurora-violet' : 'text-white'}`}>
          {song.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="font-body text-xs text-white/40 truncate">{song.artist}</p>
          {song.album && (
            <>
              <span className="text-white/20 text-xs">·</span>
              <p className="font-body text-xs text-white/30 truncate">{song.album}</p>
            </>
          )}
        </div>
      </div>

      {/* Metadata badges */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {song.videoUrl && (
          <span className="text-xs text-aurora-cyan/60 font-mono">MV</span>
        )}
        {song.syncedLyrics?.length > 0 && (
          <span className="text-xs text-aurora-gold/60 font-mono">LRC</span>
        )}
        <span className="text-xs text-white/30 font-mono w-10 text-right">
          {formatTime(song.duration)}
        </span>

        {/* Delete */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(song._id); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-white/20 hover:text-aurora-pink ml-1"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
