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
    const [volume, setVolume] = useState(1.0);
    const [isMuted, setIsMuted] = useState(false);
    const [mode, setModeState] = useState('audio'); // 'audio' | 'video'
    const [isLoading, setIsLoading] = useState(false);
    const [currentLyricIndex, setCurrentLyricIndex] = useState(-1);
    const [shuffle, setShuffle] = useState(false);
    const [loop, setLoop] = useState('none'); // 'none' | 'all' | 'one'
    const [showFullscreen, setShowFullscreen] = useState(false);

    // Sync audio volume
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = isMuted ? 0 : volume;
        }
    }, [volume, isMuted]);

    // Find current lyric index based on playback time
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

    // ── Global spacebar to toggle play/pause ──────────────────────────────────
    useEffect(() => {
        const handler = (e) => {
            // Only handle Space key
            if (e.code !== 'Space') return;
            // Don't hijack if user is typing in an input/textarea
            const tag = e.target.tagName.toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
            e.preventDefault();
            const audio = audioRef.current;
            if (!audio || !currentSong) return;
            if (audio.paused) {
                audio.play().catch(console.error);
            } else {
                audio.pause();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [currentSong]);

    const playSong = useCallback((song, songQueue = null, idx = 0) => {
        setCurrentSong(song);
        setModeState('audio');
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

    // ── Skip next — respects shuffle ──────────────────────────────────────────
    const skipNext = useCallback(() => {
        if (!queue.length) return;
        let next;
        if (shuffle) {
            // Pick a random index that isn't the current one
            if (queue.length === 1) {
                next = 0;
            } else {
                do { next = Math.floor(Math.random() * queue.length); } while (next === queueIndex);
            }
        } else {
            next = (queueIndex + 1) % queue.length;
        }
        setQueueIndex(next);
        playSong(queue[next], queue, next);
    }, [queue, queueIndex, playSong, shuffle]);

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

    // ── Handle song end — respects loop mode ──────────────────────────────────
    const handleSongEnd = useCallback(() => {
        if (loop === 'one') {
            // Repeat: seek to start and play again
            const audio = audioRef.current;
            if (audio) {
                audio.currentTime = 0;
                audio.play().catch(console.error);
            }
        } else if (loop === 'all') {
            // Loop queue: always skip next (wraps around)
            skipNext();
        } else {
            // No loop: skip next only if not at end of queue
            if (queueIndex < queue.length - 1 || shuffle) {
                skipNext();
            }
            // else: stop playback (the audio ended naturally)
        }
    }, [loop, skipNext, queueIndex, queue.length, shuffle]);

    const switchMode = useCallback((newMode) => {
        const audio = audioRef.current;
        const video = videoRef.current;
        setModeState(newMode);

        if (newMode === 'video') {
            // Switching to video: pause audio, sync video to audio time, play video
            const time = audio?.currentTime || currentTime;
            if (audio) audio.pause();
            if (video) {
                video.currentTime = time;
                video.play().catch(console.error);
            }
        } else {
            // Switching back to audio: pause video, sync audio to video time, play audio
            const time = video?.currentTime || currentTime;
            if (video) video.pause();
            if (audio) {
                audio.currentTime = time;
                audio.play().catch(console.error);
            }
        }
    }, [currentTime]);

    // Cycle loop: none → all → one → none
    const cycleLoop = useCallback(() => {
        setLoop(prev => {
            if (prev === 'none') return 'all';
            if (prev === 'all') return 'one';
            return 'none';
        });
    }, []);

    const toggleShuffle = useCallback(() => {
        setShuffle(prev => !prev);
    }, []);

    const updateSongMetadata = useCallback((updatedSong) => {
        setCurrentSong(prev => (prev?._id === updatedSong._id ? { ...prev, ...updatedSong } : prev));
        setQueue(prev => prev.map(s => s._id === updatedSong._id ? { ...s, ...updatedSong } : s));
    }, []);

    const value = {
        audioRef, videoRef,
        currentSong, setCurrentSong, queue,
        isPlaying, setIsPlaying,
        currentTime, setCurrentTime,
        duration, setDuration,
        volume, setVolume,
        isMuted, setIsMuted,
        mode, setMode: switchMode,
        isLoading, setIsLoading,
        currentLyricIndex,
        shuffle, toggleShuffle,
        loop, cycleLoop,
        playSong, togglePlay, seek,
        skipNext, skipPrev,
        handleSongEnd,
        updateSongMetadata,
        showFullscreen, setShowFullscreen
    };

    return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export const usePlayer = () => {
    const ctx = useContext(PlayerContext);
    if (!ctx) throw new Error('usePlayer must be inside PlayerProvider');
    return ctx;
};
