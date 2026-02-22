import { useState, useRef } from 'react';
import { songApi } from '../utils/api';
import { formatLRC } from '../utils/format';

export default function EditModal({ song, onClose, onSaved, initialTab = 'info' }) {
    const fileInputRef = useRef(null);
    const [form, setForm] = useState({
        title: song.title || '',
        artist: song.artist || '',
        album: song.album || ''
    });
    const [coverFile, setCoverFile] = useState(null);
    const [coverPreview, setCoverPreview] = useState(song.coverUrl || null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState(initialTab); // 'info' | 'lyrics'
    const [lyricsText, setLyricsText] = useState(() => {
        if (song.syncedLyrics && song.syncedLyrics.length > 0) {
            return song.syncedLyrics.map(l => `[${formatLRC(l.time)}] ${l.text}`).join('\n');
        }
        return song.rawLyrics || '';
    });

    const parseLRC = (lrcText) => {
        const lines = lrcText.split('\n');
        const synced = [];
        const timeRegex = /\[(\d+):(\d+)(?:\.(\d+))?\]/g;

        lines.forEach(line => {
            const matches = [...line.matchAll(timeRegex)];
            const text = line.replace(timeRegex, '').trim();
            if (!text && matches.length === 0) return;

            matches.forEach(match => {
                const min = parseInt(match[1]);
                const sec = parseInt(match[2]);
                const msPart = match[3] || '0';
                const ms = parseInt(msPart.padEnd(3, '0').slice(0, 3));
                const time = min * 60 + sec + ms / 1000;
                synced.push({ time, text });
            });
        });

        return synced.sort((a, b) => a.time - b.time);
    };

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setCoverFile(file);
            setCoverPreview(URL.createObjectURL(file));
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.title.trim() || !form.artist.trim()) {
            setError('Title and artist are required');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const formData = new FormData();
            formData.append('title', form.title);
            formData.append('artist', form.artist);
            formData.append('album', form.album);
            if (coverFile) {
                formData.append('cover', coverFile);
            }

            // Handle lyrics update
            if (activeTab === 'lyrics') {
                const parsed = parseLRC(lyricsText);
                if (parsed.length > 0) {
                    formData.append('syncedLyrics', JSON.stringify(parsed));
                    formData.append('lyricsType', 'synced');
                } else if (lyricsText.trim()) {
                    formData.append('rawLyrics', lyricsText.trim());
                    formData.append('lyricsType', 'plain');
                }
            }

            const data = await songApi.update(song._id, formData);

            if (data.success) {
                onSaved(data.song);
                onClose();
            } else {
                setError(data.error || 'Save failed');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Error saving changes');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            onClick={e => e.target === e.currentTarget && onClose()}>

            <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl animate-fade-in"
                style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)' }}>

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div
                            className="relative group cursor-pointer w-12 h-12 rounded-lg overflow-hidden flex-shrink-0"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {coverPreview ? (
                                <img src={coverPreview} alt="" className="w-full h-full object-cover transition-opacity group-hover:opacity-70" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-[var(--bg-card)] group-hover:bg-[var(--accent-muted)] transition-colors">
                                    <svg className="w-4 h-4 text-[var(--text-muted-2)]" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                                    </svg>
                                </div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                className="hidden"
                            />
                        </div>
                        <div>
                            <h2 className="font-semibold text-[var(--text-main)]">Edit Song</h2>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Update metadata</p>
                        </div>
                    </div>
                    <button onClick={onClose}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-[var(--bg-card)]"
                        style={{ color: 'var(--text-muted)' }}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex gap-4 mb-6 border-b border-[var(--border-main)]">
                    <button
                        onClick={() => setActiveTab('info')}
                        className={`pb-2 text-xs font-bold uppercase tracking-wider transition-all relative ${activeTab === 'info' ? 'text-[var(--accent)]' : 'text-[var(--text-muted-2)] hover:text-[var(--text-main)]'}`}
                    >
                        Basic Info
                        {activeTab === 'info' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)]" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('lyrics')}
                        className={`pb-2 text-xs font-bold uppercase tracking-wider transition-all relative ${activeTab === 'lyrics' ? 'text-[var(--accent)]' : 'text-[var(--text-muted-2)] hover:text-[var(--text-main)]'}`}
                    >
                        Lyrics & Sync
                        {activeTab === 'lyrics' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)]" />}
                    </button>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                    {activeTab === 'info' ? (
                        <>
                            {[
                                { key: 'title', label: 'Title', placeholder: 'Song title', required: true },
                                { key: 'artist', label: 'Artist', placeholder: 'Artist name', required: true },
                                { key: 'album', label: 'Album', placeholder: 'Album (optional)', required: false }
                            ].map(({ key, label, placeholder, required }) => (
                                <div key={key}>
                                    <label className="block text-xs font-medium mb-1.5"
                                        style={{ color: 'var(--text-muted)' }}>
                                        {label} {required && <span style={{ color: 'var(--accent)' }}>*</span>}
                                    </label>
                                    <input
                                        type="text"
                                        value={form[key]}
                                        onChange={e => set(key, e.target.value)}
                                        placeholder={placeholder}
                                        required={required}
                                        className="w-full rounded-xl px-4 py-3 text-sm text-[var(--text-main)] outline-none transition-all placeholder:text-[var(--text-muted-2)]"
                                        style={{
                                            background: 'var(--bg-card)',
                                            border: '1px solid var(--border-main)'
                                        }}
                                        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                                        onBlur={e => e.target.style.borderColor = 'var(--border-main)'}
                                    />
                                </div>
                            ))}
                        </>
                    ) : (
                        <div>
                            <label className="block text-xs font-medium mb-1.5"
                                style={{ color: 'var(--text-muted)' }}>
                                LRC Lyrics (paste with [mm:ss.xx] timestamps)
                            </label>
                            <textarea
                                value={lyricsText}
                                onChange={e => setLyricsText(e.target.value)}
                                placeholder="[00:12.50] Verse 1...&#10;[00:20.00] Next line..."
                                className="w-full h-64 rounded-xl px-4 py-3 text-sm text-[var(--text-main)] outline-none transition-all placeholder:text-[var(--text-muted-2)] font-mono leading-relaxed"
                                style={{
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--border-main)',
                                    resize: 'none'
                                }}
                                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                                onBlur={e => e.target.style.borderColor = 'var(--border-main)'}
                            />
                            <p className="mt-2 text-[10px]" style={{ color: 'var(--text-muted-2)' }}>
                                Format: [minutes:seconds.centiseconds] Lyrics
                            </p>
                        </div>
                    )}

                    {error && (
                        <p className="text-xs rounded-lg px-3 py-2" style={{ background: 'rgba(255,69,58,0.1)', color: '#ff453a' }}>
                            {error}
                        </p>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
                            style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}>
                            Cancel
                        </button>
                        <button type="submit" disabled={loading}
                            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-lg"
                            style={{ background: loading ? 'var(--accent-muted)' : 'var(--accent)', opacity: loading ? 0.7 : 1 }}>
                            {loading ? 'Saving…' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
