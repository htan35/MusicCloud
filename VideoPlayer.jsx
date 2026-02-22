import { useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';

export default function VideoPlayer({ visible }) {
  const { videoRef, currentSong, isPlaying, currentTime, audioRef } = usePlayer();

  // Sync video play/pause with audio
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !visible) return;

    if (isPlaying) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isPlaying, visible, videoRef]);

  // Sync time when switching to video mode
  useEffect(() => {
    if (visible && videoRef.current && audioRef.current) {
      videoRef.current.currentTime = audioRef.current.currentTime;
    }
  }, [visible, videoRef, audioRef]);

  if (!currentSong?.videoUrl) return null;

  return (
    <div
      className={`absolute inset-0 transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      <video
        ref={videoRef}
        src={currentSong.videoUrl}
        className="w-full h-full object-cover"
        muted={false}
        playsInline
        preload="metadata"
        style={{ display: visible ? 'block' : 'none' }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-obsidian-950 via-transparent to-transparent" />
    </div>
  );
}
