import { useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';

/**
 * AudioEngine — invisible component that manages the HTML audio element
 * and wires up all audio events to the player context state.
 */
export default function AudioEngine() {
    const {
        audioRef, videoRef,
        currentSong,
        setIsPlaying, setCurrentTime, setDuration, setIsLoading,
        volume, isMuted,
        mode,
        handleSongEnd
    } = usePlayer();

    // Auto-load and auto-play when current song changes
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !currentSong) return;

        audio.src = currentSong.audioUrl;
        audio.load();

        const handleCanPlay = () => {
            setIsLoading(false);
            audio.play().catch(console.error);
        };

        audio.addEventListener('canplay', handleCanPlay, { once: true });
        setIsLoading(true);

        return () => {
            audio.removeEventListener('canplay', handleCanPlay);
        };
    }, [currentSong, audioRef, setIsLoading]);

    // Wire up audio event listeners
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const onTimeUpdate = () => {
            setCurrentTime(audio.currentTime);
            // Keep video in sync (max 0.3s drift allowed)
            if (mode === 'video' && videoRef.current) {
                const diff = Math.abs(videoRef.current.currentTime - audio.currentTime);
                if (diff > 0.3) {
                    videoRef.current.currentTime = audio.currentTime;
                }
            }
        };
        const onDurationChange = () => setDuration(audio.duration);
        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);
        const onEnded = () => { setIsPlaying(false); handleSongEnd(); };
        const onWaiting = () => setIsLoading(true);
        const onPlaying = () => setIsLoading(false);

        audio.addEventListener('timeupdate', onTimeUpdate);
        audio.addEventListener('durationchange', onDurationChange);
        audio.addEventListener('play', onPlay);
        audio.addEventListener('pause', onPause);
        audio.addEventListener('ended', onEnded);
        audio.addEventListener('waiting', onWaiting);
        audio.addEventListener('playing', onPlaying);

        return () => {
            audio.removeEventListener('timeupdate', onTimeUpdate);
            audio.removeEventListener('durationchange', onDurationChange);
            audio.removeEventListener('play', onPlay);
            audio.removeEventListener('pause', onPause);
            audio.removeEventListener('ended', onEnded);
            audio.removeEventListener('waiting', onWaiting);
            audio.removeEventListener('playing', onPlaying);
        };
    }, [audioRef, videoRef, mode, setIsPlaying, setCurrentTime, setDuration, setIsLoading, handleSongEnd]);

    // Volume sync
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = isMuted ? 0 : volume;
        }
    }, [volume, isMuted, audioRef]);

    return (
        <audio
            ref={audioRef}
            preload="metadata"
            style={{ display: 'none' }}
        />
    );
}
