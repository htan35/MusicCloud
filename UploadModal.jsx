import { useState, useRef } from 'react';
import { songApi } from '../utils/api';

export default function UploadModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ title: '', artist: '', album: '', lyrics: '' });
  const [files, setFiles] = useState({ audio: null, cover: null, video: null });
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState('');

  const audioRef = useRef();
  const coverRef = useRef();
  const videoRef = useRef();

  const handleFile = (key, file) => {
    if (!file) return;
    setFiles(prev => ({ ...prev, [key]: file }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.artist || !files.audio) {
      setError('Title, artist, and audio file are required.');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('artist', form.artist);
      fd.append('album', form.album);
      fd.append('lyrics', form.lyrics);
      fd.append('audio', files.audio);
      if (files.cover) fd.append('cover', files.cover);
      if (files.video) fd.append('video', files.video);

      const result = await songApi.upload(fd, setProgress);
      onSuccess(result.song);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const FileDropZone = ({ label, accept, fileKey, icon, fileRef }) => {
    const file = files[fileKey];
    return (
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(fileKey); }}
        onDragLeave={() => setDragOver('')}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver('');
          handleFile(fileKey, e.dataTransfer.files[0]);
        }}
        onClick={() => fileRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all
          flex items-center gap-3
          ${dragOver === fileKey
            ? 'border-aurora-violet bg-aurora-violet/10'
            : file
              ? 'border-aurora-cyan/50 bg-aurora-cyan/5'
              : 'border-white/10 hover:border-white/30'
          }
        `}
      >
        <input
          ref={fileRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => handleFile(fileKey, e.target.files[0])}
        />
        <span className="text-2xl">{icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-body text-white/60 font-medium">{label}</p>
          {file ? (
            <p className="text-xs text-aurora-cyan truncate">{file.name}</p>
          ) : (
            <p className="text-xs text-white/30">Drop or click to upload</p>
          )}
        </div>
        {file && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setFiles(prev => ({ ...prev, [fileKey]: null })); }}
            className="ml-auto text-white/30 hover:text-aurora-pink transition-colors"
          >
            ✕
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="glass-strong rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-white">Upload Song</h2>
            <button onClick={onClose} className="text-white/30 hover:text-white transition-colors text-xl">✕</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-body text-white/40 mb-1.5 uppercase tracking-wider">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                className="w-full bg-obsidian-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 border border-white/5 focus:border-aurora-violet focus:outline-none transition-colors"
                placeholder="Song title"
              />
            </div>
            <div>
              <label className="block text-xs font-body text-white/40 mb-1.5 uppercase tracking-wider">Artist *</label>
              <input
                type="text"
                value={form.artist}
                onChange={e => setForm(p => ({ ...p, artist: e.target.value }))}
                className="w-full bg-obsidian-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 border border-white/5 focus:border-aurora-violet focus:outline-none transition-colors"
                placeholder="Artist name"
              />
            </div>
            <div>
              <label className="block text-xs font-body text-white/40 mb-1.5 uppercase tracking-wider">Album</label>
              <input
                type="text"
                value={form.album}
                onChange={e => setForm(p => ({ ...p, album: e.target.value }))}
                className="w-full bg-obsidian-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 border border-white/5 focus:border-aurora-violet focus:outline-none transition-colors"
                placeholder="Album name"
              />
            </div>
          </div>

          {/* File uploads */}
          <div className="space-y-2">
            <label className="block text-xs font-body text-white/40 uppercase tracking-wider">Files</label>
            <FileDropZone label="Audio *" accept="audio/*" fileKey="audio" icon="🎵" fileRef={audioRef} />
            <FileDropZone label="Album Cover" accept="image/*" fileKey="cover" icon="🖼️" fileRef={coverRef} />
            <FileDropZone label="Music Video (optional)" accept="video/*" fileKey="video" icon="🎬" fileRef={videoRef} />
          </div>

          {/* Lyrics */}
          <div>
            <label className="block text-xs font-body text-white/40 mb-1.5 uppercase tracking-wider">
              Lyrics
              <span className="ml-2 normal-case text-white/20 font-normal">LRC or plain text</span>
            </label>
            <textarea
              value={form.lyrics}
              onChange={e => setForm(p => ({ ...p, lyrics: e.target.value }))}
              rows={5}
              className="w-full bg-obsidian-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 border border-white/5 focus:border-aurora-violet focus:outline-none transition-colors font-mono resize-none"
              placeholder={`[00:12.00] First line of lyrics...\n[00:15.50] Second line...\n\nOr paste plain text - timestamps auto-generated`}
            />
            <p className="text-xs text-white/20 mt-1">
              LRC timestamps are parsed directly. Plain text gets auto-synced timestamps.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Upload progress */}
          {uploading && (
            <div>
              <div className="flex justify-between text-xs text-white/40 mb-1">
                <span>Uploading...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 bg-obsidian-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-aurora-pink to-aurora-violet rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 font-body text-sm hover:border-white/30 hover:text-white transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-aurora-pink to-aurora-violet text-white font-body font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Upload Song'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
