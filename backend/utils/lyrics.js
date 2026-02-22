/**
 * Lyrics processing utility — smart sync engine.
 *
 * Supports three input formats:
 *  1. LRC  — [mm:ss.xx] timestamps (parsed directly, perfect sync)
 *  2. Section-tagged plain text — [verse], [chorus], [intro], [bridge] etc.
 *     Uses a section-aware, syllable-weighted timing algorithm.
 *  3. Raw plain text — syllable-weighted even distribution as fallback.
 */

// ─── LRC parser ───────────────────────────────────────────────────────────────

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
            const time = parseInt(match[1]) * 60 + parseInt(match[2]) + parseInt(match[3].padEnd(3, '0')) / 1000;
            result.push({ time: parseFloat(time.toFixed(3)), text });
        }
    }
    return result.sort((a, b) => a.time - b.time);
}

function isLRC(text) {
    return /\[\d{2}:\d{2}\.\d{2,3}\]/.test(text);
}

// ─── Section-aware plain-text parser ──────────────────────────────────────────

/**
 * Sections and their relative speed multipliers.
 * Lower = more time given per syllable (slower delivery).
 * Higher = less time per syllable (faster/dense delivery).
 */
const SECTION_SPEED = {
    intro: 0.7,   // Slow intro, lots of breathing room
    outro: 0.7,   // Slow outro / fade out
    verse: 1.0,   // Normal pace
    'pre-chorus': 1.1,
    prechorus: 1.1,
    bridge: 0.9,   // Slightly slower, emotional
    chorus: 1.3,   // Chorus is faster, repeated energy
    hook: 1.3,
    refrain: 1.3,
    rap: 1.8,   // Rap verses are dense and fast
    interlude: 0.6,  // Long gap / instrumental
    default: 1.0,
};

/**
 * Count syllables in a line (heuristic — good enough for timing).
 * Handles English well; passable for romanized other languages.
 */
function syllableCount(line) {
    if (!line || !line.trim()) return 0;
    const word = line.toLowerCase().replace(/[^a-z\s]/g, '');
    const words = word.split(/\s+/).filter(Boolean);
    let count = 0;
    for (const w of words) {
        // Count vowel groups as syllables
        const syl = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
            .replace(/^y/, '')
            .match(/[aeiouy]{1,2}/g);
        count += syl ? Math.max(1, syl.length) : 1;
    }
    return Math.max(1, count);
}

/**
 * Parse section-tagged lyrics into an array of sections.
 * Each section: { label, lines: string[], speed: number }
 */
function parseSections(text) {
    const sectionRegex = /^\[([^\]]+)\]\s*$/i;
    const rawLines = text.split('\n').map(l => l.trim());
    const sections = [];
    let current = { label: 'intro', speed: SECTION_SPEED.intro, lines: [] };

    for (const line of rawLines) {
        const sectionMatch = line.match(sectionRegex);
        if (sectionMatch) {
            // Save previous section if it has content
            if (current.lines.length > 0) sections.push(current);
            const label = sectionMatch[1].toLowerCase().replace(/\s+/g, '');
            const speed = SECTION_SPEED[label] || SECTION_SPEED.default;
            current = { label, speed, lines: [] };
        } else if (line.length > 0) {
            current.lines.push(line);
        }
        // Skip blank lines
    }
    if (current.lines.length > 0) sections.push(current);

    return sections;
}

/**
 * Smarter timestamp generation for [section]-tagged lyrics.
 *
 * Algorithm:
 * 1. Parse sections and their lines.
 * 2. Compute each line's "weight" = syllables × (1 / section_speed).
 *    → Heavy lines (many syllables, slow section) get more time.
 *    → Dense sections (chorus, rap) get less time per syllable.
 * 3. Sum all weights, distribute total duration proportionally.
 * 4. Add a 1-second "breath" gap at the start of each new section.
 *
 * @param {string} text
 * @param {number} duration - total audio duration in seconds
 * @returns {{ time: number, text: string, section: string }[]}
 */
function generateSectionTimestamps(text, duration) {
    // Has no section tags → fall back to syllable-weighted flat distribution
    if (!/^\[[^\]]+\]\s*$/im.test(text)) {
        return generateWeightedTimestamps(text, duration);
    }

    const sections = parseSections(text);
    if (!sections.length) return [];

    // First pass: compute weight per line
    const allLines = []; // { text, section, weight, isFirst }
    for (let s = 0; s < sections.length; s++) {
        const sec = sections[s];
        for (let i = 0; i < sec.lines.length; i++) {
            const syllables = syllableCount(sec.lines[i]);
            const weight = syllables / sec.speed;
            allLines.push({
                text: sec.lines[i],
                section: sec.label,
                weight,
                isFirst: i === 0,  // first line of a new section
            });
        }
    }

    if (!allLines.length) return [];

    // Reserve some time at the start (musical intro before vocals)
    // Heuristic: 4 seconds minimum, up to 8% of song duration
    const introGap = Math.min(8, Math.max(4, duration * 0.08));

    // Reserve time at the end (outro/fade)
    const outroGap = Math.min(5, duration * 0.05);

    const usableDuration = duration - introGap - outroGap;

    // Section-transition gaps: 0.8s per section boundary
    const sectionGaps = (sections.length - 1) * 0.8;
    const lyricDuration = Math.max(usableDuration - sectionGaps, usableDuration * 0.9);

    // Sum weights
    const totalWeight = allLines.reduce((sum, l) => sum + l.weight, 0);
    const secondsPerWeightUnit = lyricDuration / totalWeight;

    // Second pass: assign timestamps
    const result = [];
    let cursor = introGap;
    let lastSection = null;

    for (const line of allLines) {
        // Add section gap when entering a new section
        if (line.isFirst && lastSection !== null) {
            cursor += 0.8;
        }
        lastSection = line.section;

        result.push({
            time: parseFloat(cursor.toFixed(3)),
            text: line.text,
            section: line.section,
        });

        cursor += line.weight * secondsPerWeightUnit;
    }

    return result;
}

/**
 * Syllable-weighted flat distribution (no section tags).
 */
function generateWeightedTimestamps(text, duration) {
    const lines = text
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0 && !/^\[[^\]]+\]$/.test(l)); // strip any stray tags

    if (!lines.length) return [];

    const weights = lines.map(l => syllableCount(l));
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    const introGap = Math.min(5, duration * 0.06);
    const usable = duration - introGap - Math.min(4, duration * 0.04);

    let cursor = introGap;
    return lines.map((text, i) => {
        const entry = { time: parseFloat(cursor.toFixed(3)), text };
        cursor += (weights[i] / totalWeight) * usable;
        return entry;
    });
}

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * Process lyrics text into syncedLyrics array.
 * @param {string} text - raw lyrics (LRC or plain/sectioned)
 * @param {number} duration - audio duration in seconds
 * @returns {{ syncedLyrics: Array, lyricsType: string }}
 */
function processLyrics(text, duration = 0) {
    if (!text || !text.trim()) {
        return { syncedLyrics: [], lyricsType: 'none' };
    }

    // LRC with real timestamps — parse directly
    if (isLRC(text)) {
        return { syncedLyrics: parseLRC(text), lyricsType: 'lrc' };
    }

    // Section-tagged or plain text — smart distribution
    const dur = duration > 0 ? duration : 180; // default 3 min if unknown
    const syncedLyrics = generateSectionTimestamps(text, dur);
    const hasSection = /^\[[^\]]+\]\s*$/im.test(text);

    return {
        syncedLyrics,
        lyricsType: hasSection ? 'sectioned' : 'plain'
    };
}

module.exports = { processLyrics, parseLRC, isLRC, generateSectionTimestamps, syllableCount };
