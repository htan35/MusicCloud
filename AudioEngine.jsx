import { useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';

export default function AudioEngine() {
  const {
    audioRef, videoRef,
    currentSong,
    setIsPlaying, setCurrentTime, setDuration, setIsLoading,
    volume, isMuted,
    mode,
    skipNext
  } = usePlayer();

  // Auto-play when song changes
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

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      // Sync video if in video mode
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
    const onEnded = () => { setIsPlaying(false); skipNext(); };
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
  }, [audioRef, videoRef, mode, setIsPlaying, setCurrentTime, setDuration, setIsLoading, skipNext]);

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
