import { useState, useEffect, useCallback } from 'react';
import { songApi } from '../utils/api';
import SongCard from './SongCard';
import UploadModal from './UploadModal';

export default function Library() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [error, setError] = useState('');

  const fetchSongs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await songApi.getAll();
      setSongs(data.songs || []);
    } catch (err) {
      setError('Failed to load songs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSongs(); }, [fetchSongs]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this song?')) return;
    try {
      await songApi.delete(id);
      setSongs(prev => prev.filter(s => s._id !== id));
    } catch {
      setError('Failed to delete song');
    }
  };

  const handleUploadSuccess = (song) => {
    setSongs(prev => [song, ...prev]);
  };

  const filtered = songs.filter(s =>
    !search ||
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.artist.toLowerCase().includes(search.toLowerCase()) ||
    s.album?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="font-display text-3xl font-bold text-gradient">Aura</h1>
            <p className="font-body text-xs text-white/30 mt-0.5">Your music, elevated</p>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-aurora-pink to-aurora-violet text-white text-sm font-body font-medium hover:opacity-90 transition-opacity glow-violet"
          >
            <span>+</span>
            <span>Upload</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search songs, artists..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-obsidian-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/20 border border-white/5 focus:border-aurora-violet/50 focus:outline-none transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 pb-3 flex gap-4 flex-shrink-0">
        <span className="text-xs font-mono text-white/20">{songs.length} songs</span>
        {search && <span className="text-xs font-mono text-aurora-violet/60">{filtered.length} results</span>}
      </div>

      {/* Song list */}
      <div className="flex-1 overflow-y-auto px-2">
        {error && (
          <div className="mx-4 mb-3 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
            <p className="text-red-400 text-xs">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col gap-2 px-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 animate-pulse">
                <div className="w-12 h-12 rounded-lg bg-obsidian-700" />
                <div className="flex-1">
                  <div className="h-3.5 bg-obsidian-700 rounded w-3/4 mb-2" />
                  <div className="h-2.5 bg-obsidian-800 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            {songs.length === 0 ? (
              <>
                <div className="text-5xl mb-4">🎵</div>
                <p className="font-display text-white/40 text-lg">No songs yet</p>
                <p className="font-body text-white/20 text-sm mt-1">Upload your first song to get started</p>
                <button
                  onClick={() => setShowUpload(true)}
                  className="mt-4 px-5 py-2 rounded-xl bg-aurora-violet/20 border border-aurora-violet/30 text-aurora-violet text-sm font-body hover:bg-aurora-violet/30 transition-colors"
                >
                  Upload Song
                </button>
              </>
            ) : (
              <>
                <div className="text-4xl mb-3">🔍</div>
                <p className="font-body text-white/30 text-sm">No results for "{search}"</p>
              </>
            )}
          </div>
        ) : (
          <div className="pb-32">
            {filtered.map((song, i) => (
              <SongCard
                key={song._id}
                song={song}
                songs={filtered}
                index={i}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={handleUploadSuccess}
        />
      )}
    </div>
  );
}
