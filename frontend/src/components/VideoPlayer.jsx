import { useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';

/**
 * VideoPlayer — overlays the album art area and syncs with the audio engine.
 * Uses CSS opacity instead of display:none so the video element stays mounted
 * and currentTime is preserved when switching modes.
 */
export default function VideoPlayer({ visible }) {
    const { videoRef, currentSong, isPlaying, audioRef } = usePlayer();

    // Sync play/pause state with audio
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !visible) return;

        if (isPlaying) {
            video.play().catch(() => { });
        } else {
            video.pause();
        }
    }, [isPlaying, visible, videoRef]);

    // Sync playback position when switching TO video mode
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
            />
            {/* Gradient overlay at the bottom */}
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-body)] via-transparent to-transparent" />
        </div>
    );
}
