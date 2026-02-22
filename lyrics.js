/**
 * Lyrics processing utility.
 * - If LRC format: parse timestamps directly.
 * - If plain text: generate evenly-spaced timestamps based on duration.
 *   (True forced alignment via Aeneas requires a Python subprocess; this
 *    provides a deterministic fallback that works without Python installed.)
 */

/**
 * Parse LRC format lyrics into synced array.
 * @param {string} lrc
 * @returns {{ time: number, text: string }[]}
 */
function parseLRC(lrc) {
  const lines = lrc.split('\n');
  const result = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;

  for (const line of lines) {
    const matches = [...line.matchAll(timeRegex)];
    if (!matches.length) continue;

    const text = line.replace(timeRegex, '').trim();
    if (!text) continue;

    for (const match of matches) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const ms = parseInt(match[3].padEnd(3, '0'));
      const time = minutes * 60 + seconds + ms / 1000;
      result.push({ time: parseFloat(time.toFixed(3)), text });
    }
  }

  return result.sort((a, b) => a.time - b.time);
}

/**
 * Detect if text is LRC format.
 */
function isLRC(text) {
  return /\[\d{2}:\d{2}\.\d{2,3}\]/.test(text);
}

/**
 * Generate evenly-spaced timestamps for plain lyrics.
 * Falls back to equal distribution when Aeneas is unavailable.
 * @param {string} plainText
 * @param {number} duration - audio duration in seconds
 * @returns {{ time: number, text: string }[]}
 */
function generateTimestamps(plainText, duration) {
  const lines = plainText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (!lines.length) return [];

  const interval = duration / lines.length;
  return lines.map((text, i) => ({
    time: parseFloat((i * interval).toFixed(3)),
    text
  }));
}

/**
 * Try to run Aeneas forced alignment. Returns null if Aeneas not available.
 * @param {string} audioPath - local temp path
 * @param {string} plainText
 * @returns {Promise<{ time: number, text: string }[]|null>}
 */
async function runAeneas(audioPath, plainText) {
  try {
    const { execFile } = require('child_process');
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    const { promisify } = require('util');
    const execFileAsync = promisify(execFile);

    const tmpDir = os.tmpdir();
    const txtPath = path.join(tmpDir, `lyrics_${Date.now()}.txt`);
    const outPath = path.join(tmpDir, `aligned_${Date.now()}.json`);

    // Write lyrics to temp file
    fs.writeFileSync(txtPath, plainText);

    await execFileAsync('python3', [
      '-m', 'aeneas.tools.execute_task',
      audioPath,
      txtPath,
      'task_language=eng|os_task_file_format=json|is_text_type=plain',
      outPath
    ], { timeout: 120000 });

    const raw = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    fs.unlinkSync(txtPath);
    fs.unlinkSync(outPath);

    // Aeneas JSON format: { fragments: [{ begin, end, lines }] }
    return raw.fragments.map(f => ({
      time: parseFloat(parseFloat(f.begin).toFixed(3)),
      text: f.lines.join(' ')
    }));
  } catch {
    return null; // Aeneas not installed or failed
  }
}

/**
 * Process lyrics text.
 * @param {string} text - raw lyrics (LRC or plain)
 * @param {number} duration - audio duration in seconds
 * @param {string|null} audioPath - local path for Aeneas (optional)
 * @returns {Promise<{ syncedLyrics: Array, lyricsType: string }>}
 */
async function processLyrics(text, duration = 0, audioPath = null) {
  if (!text || !text.trim()) {
    return { syncedLyrics: [], lyricsType: 'none' };
  }

  if (isLRC(text)) {
    return { syncedLyrics: parseLRC(text), lyricsType: 'lrc' };
  }

  // Plain text - try Aeneas first
  if (audioPath && duration > 0) {
    const aeneasResult = await runAeneas(audioPath, text);
    if (aeneasResult) {
      return { syncedLyrics: aeneasResult, lyricsType: 'synced' };
    }
  }

  // Fallback: evenly distributed
  const syncedLyrics = generateTimestamps(text, duration || 180);
  return { syncedLyrics, lyricsType: 'plain' };
}

module.exports = { processLyrics, parseLRC, generateTimestamps, isLRC };
