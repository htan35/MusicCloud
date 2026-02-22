import { useState, useRef } from 'react';
import './SyncLyrics.css';

export default function SyncLyrics() {
  const [mp3, setMp3] = useState(null);
  const [lyrics, setLyrics] = useState('');
  const [songName, setSongName] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  // ─── Handle Form Submit ──────────────────────────────────────
  const handleSync = async () => {
    if (!mp3) return setError('Please upload an MP3 file');
    if (!lyrics.trim()) return setError('Please enter lyrics');

    setLoading(true);
    setError('');
    setResult(null);

    const form = new FormData();
    form.append('mp3', mp3);
    form.append('lyrics', lyrics);
    form.append('songName', songName || mp3.name.replace('.mp3', ''));

    try {
      const res = await fetch('/api/sync-lyrics', {
        method: 'POST',
        body: form,
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Sync failed');

      setResult(data);
    } catch (e) {
      setError(e.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Audio time update → highlight current lyric ────────────
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  // ─── Find which lyric line is currently active ───────────────
  const getActiveLine = () => {
    if (!result) return -1;
    const timedLines = result.syncedLyrics.filter(l => l.time !== null);
    let activeIdx = -1;
    for (let i = 0; i < timedLines.length; i++) {
      if (timedLines[i].time <= currentTime) activeIdx = i;
    }
    return activeIdx;
  };

  // ─── Download .lrc file ──────────────────────────────────────
  const downloadLRC = () => {
    const blob = new Blob([result.lrcContent], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${result.songName || 'synced'}.lrc`;
    a.click();
  };

  // ─── Download synced lyrics as JSON ─────────────────────────
  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(result.syncedLyrics, null, 2)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${result.songName || 'synced'}.json`;
    a.click();
  };

  const activeLine = getActiveLine();
  const timedLines = result?.syncedLyrics.filter(l => l.time !== null) || [];

  // ─── Format seconds to MM:SS.xx ─────────────────────────────
  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return '--:--';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toFixed(2).padStart(5, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="sync-container">
      <div className="sync-header">
        <h1>🎵 Lyrics Sync AI</h1>
        <p>Upload your MP3 and paste your lyrics — AI will sync them automatically</p>
      </div>

      {/* ── Input Form ── */}
      <div className="sync-form">
        <div className="form-group">
          <label>Song Name</label>
          <input
            type="text"
            placeholder="e.g. My Favourite Song"
            value={songName}
            onChange={(e) => setSongName(e.target.value)}
            className="input-text"
          />
        </div>

        <div className="form-group">
          <label>MP3 File</label>
          <div className="file-drop" onClick={() => document.getElementById('mp3input').click()}>
            {mp3 ? (
              <span className="file-name">✅ {mp3.name}</span>
            ) : (
              <span>Click to upload MP3 (max 50MB)</span>
            )}
            <input
              id="mp3input"
              type="file"
              accept=".mp3,audio/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                setMp3(e.target.files[0]);
                setError('');
              }}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Lyrics</label>
          <textarea
            className="lyrics-input"
            placeholder={`Paste your lyrics with section labels:\n\n[Intro]\nFirst line here\nSecond line here\n\n[Verse 1]\nVerse line one\nVerse line two\n\n[Chorus]\nChorus line one`}
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            rows={14}
          />
          <small className="hint">
            Use [Intro], [Verse 1], [Chorus], [Bridge] etc. to label sections
          </small>
        </div>

        {error && <div className="error-box">⚠️ {error}</div>}

        <button
          className={`sync-btn ${loading ? 'loading' : ''}`}
          onClick={handleSync}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner" />
              Syncing... (this may take 1–2 minutes)
            </>
          ) : (
            '🎵 Sync Lyrics with AI'
          )}
        </button>
      </div>

      {/* ── Results ── */}
      {result && (
        <div className="result-section">
          <div className="result-header">
            <h2>✅ {result.songName}</h2>
            <div className="result-stats">
              <span>{result.matchedLines} / {result.totalLines} lines matched</span>
            </div>
            <div className="download-btns">
              <button className="btn-download" onClick={downloadLRC}>
                ⬇ Download .lrc
              </button>
              <button className="btn-download secondary" onClick={downloadJSON}>
                ⬇ Download .json
              </button>
            </div>
          </div>

          {/* Audio Player */}
          <div className="audio-player">
            <audio
              ref={audioRef}
              src={result.mp3Url}
              controls
              onTimeUpdate={handleTimeUpdate}
            />
          </div>

          {/* Synced Lyrics Display */}
          <div className="lyrics-display">
            {result.syncedLyrics.map((line, i) => {
              const timedIndex = timedLines.indexOf(line);
              const isActive = timedIndex === activeLine;

              return (
                <div
                  key={i}
                  className={`lyric-line ${line.type === 'section' ? 'section-label' : ''} ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    if (line.time !== null && audioRef.current) {
                      audioRef.current.currentTime = line.time;
                    }
                  }}
                >
                  <span className="timestamp">
                    {formatTime(line.time)}
                  </span>
                  <span className="lyric-text">
                    {line.type === 'section' ? line.label : line.text}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
