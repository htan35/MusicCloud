/**
 * AlbumCard — displays a grouped album in the "Your Collection" grid.
 * Props: album (string), artist (string), cover (url|null), count (number),
 *        songs (array), onPlay (fn)
 */
import { usePlayer } from '../context/PlayerContext';

export default function AlbumCard({ album, artist, cover, count, songs = [], onOpen }) {
    const { playSong } = usePlayer();

    const handlePlay = (e) => {
        e.stopPropagation();
        if (songs.length > 0) {
            playSong(songs[0], songs, 0);
        }
    };

    return (
        <div className="group cursor-pointer" onClick={() => onOpen && onOpen(album)}>
            {/* Cover */}
            <div className="relative aspect-square w-full overflow-hidden rounded-xl"
                style={{ boxShadow: 'var(--shadow-card)' }}>
                {cover ? (
                    <img src={cover} alt={album}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[var(--bg-card)] border border-[var(--border-main)]">
                        <svg className="w-10 h-10 text-[var(--text-muted-2)]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                        </svg>
                    </div>
                )}

                {/* Hover overlay - Play Button */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }}>
                    <button
                        onClick={handlePlay}
                        className="w-12 h-12 rounded-full flex items-center justify-center transform scale-90 group-hover:scale-100 transition-transform duration-300 hover:scale-110 active:scale-95"
                        style={{ background: 'var(--accent)', boxShadow: '0 8px 20px rgba(0,0,0,0.4)' }}
                    >
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24" style={{ marginLeft: 3 }}>
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Labels */}
            <div className="pt-2.5 px-0.5">
                <p className="text-sm font-bold truncate text-[var(--text-main)] tracking-tight">
                    {album}
                </p>
                <p className="text-xs mt-0.5 truncate font-medium" style={{ color: 'var(--text-muted)' }}>{artist}</p>
                <p className="text-[10px] mt-1 font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted-2)' }}>
                    {count} {count === 1 ? 'song' : 'songs'}
                </p>
            </div>
        </div>
    );
}
