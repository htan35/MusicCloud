import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const audioRef = useRef(null);
  const videoRef = useRef(null);

  const [currentSong, setCurrentSong] = useState(null);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [mode, setMode] = useState('audio'); // 'audio' | 'video'
  const [isLoading, setIsLoading] = useState(false);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(-1);

  // Sync audio volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Find current lyric index
  useEffect(() => {
    if (!currentSong?.syncedLyrics?.length) return;
    const lyrics = currentSong.syncedLyrics;
    let idx = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (currentTime >= lyrics[i].time) idx = i;
      else break;
    }
    setCurrentLyricIndex(idx);
  }, [currentTime, currentSong]);

  const playSong = useCallback((song, songQueue = null, idx = 0) => {
    setCurrentSong(song);
    setMode('audio');
    setCurrentTime(0);
    setCurrentLyricIndex(-1);
    if (songQueue) {
      setQueue(songQueue);
      setQueueIndex(idx);
    }
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(console.error);
    }
  }, [isPlaying]);

  const seek = useCallback((time) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
    // Sync video if active
    if (videoRef.current && mode === 'video') {
      videoRef.current.currentTime = time;
    }
  }, [mode]);

  const skipNext = useCallback(() => {
    if (!queue.length) return;
    const next = (queueIndex + 1) % queue.length;
    setQueueIndex(next);
    playSong(queue[next], queue, next);
  }, [queue, queueIndex, playSong]);

  const skipPrev = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      seek(0);
      return;
    }
    if (!queue.length) return;
    const prev = (queueIndex - 1 + queue.length) % queue.length;
    setQueueIndex(prev);
    playSong(queue[prev], queue, prev);
  }, [queue, queueIndex, playSong, seek]);

  const switchMode = useCallback((newMode) => {
    const time = audioRef.current?.currentTime || currentTime;
    setMode(newMode);
    // Sync will happen via useEffect in Player component
    if (newMode === 'video' && videoRef.current) {
      videoRef.current.currentTime = time;
    }
  }, [currentTime]);

  const value = {
    audioRef, videoRef,
    currentSong, queue,
    isPlaying, setIsPlaying,
    currentTime, setCurrentTime,
    duration, setDuration,
    volume, setVolume,
    isMuted, setIsMuted,
    mode, setMode: switchMode,
    isLoading, setIsLoading,
    currentLyricIndex,
    playSong, togglePlay, seek,
    skipNext, skipPrev
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be inside PlayerProvider');
  return ctx;
};
