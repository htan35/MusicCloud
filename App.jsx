import './index.css';
import { PlayerProvider } from './context/PlayerContext';
import AudioEngine from './components/AudioEngine';
import Library from './components/Library';
import NowPlaying from './components/NowPlaying';
import PlayerControls from './components/PlayerControls';

export default function App() {
  return (
    <PlayerProvider>
      <AudioEngine />

      {/* Background ambient effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-aurora-violet/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-aurora-pink/5 rounded-full blur-3xl" />
        <div className="absolute top-2/3 left-1/2 w-64 h-64 bg-aurora-cyan/3 rounded-full blur-3xl" />
      </div>

      {/* Main layout */}
      <div className="flex h-screen overflow-hidden bg-obsidian-950">
        {/* Left: Library */}
        <div className="w-80 flex-shrink-0 h-full border-r border-white/5 glass flex flex-col overflow-hidden">
          <Library />
        </div>

        {/* Right: Now Playing */}
        <div className="flex-1 h-full overflow-hidden glass flex flex-col">
          <NowPlaying />
        </div>
      </div>

      {/* Bottom player bar */}
      <PlayerControls />
    </PlayerProvider>
  );
}
