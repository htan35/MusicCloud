/**
 * Extracts unique keywords from lyrics to boost AssemblyAI transcription accuracy.
 */
export function extractKeyWords(lyrics) {
    const words = lyrics
        .toLowerCase()
        .replace(/\[.*?\]/g, '')       // remove section labels
        .match(/\b[a-z]{3,}\b/g) || []; // only words 3+ chars

    return [...new Set(words)].slice(0, 1000);
}

/**
 * Aligns lyrics lines to transcribed words using multi-word anchor matching.
 * Uses the first 2-3 words of a line as a 'signature' to find the correct timestamp.
 * Enforces strictly increasing time to prevent overlapping or backtracking.
 */
export function alignLyrics(lyricsText, words = []) {
    const lines = lyricsText.trim().split('\n');
    const synced = [];
    let currentWordIdx = 0;

    // Pre-prepare transcription: lowercase and clean for fast matching
    const transWords = words.map(w => ({
        text: w.text.toLowerCase().replace(/[^\w]/g, ''),
        start: w.start,
        confidence: w.confidence
    }));

    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        // ─── Section labels: [Intro], [Verse 1], etc. ───
        if (/^\[.+\]$/.test(line)) {
            synced.push({ type: 'section', label: line, time: null });
            continue;
        }

        // Clean lyric line tokens
        const lineTokens = line
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(Boolean);

        if (!lineTokens.length) continue;

        let matchedTime = null;

        // Signature matching: Try matching the first 3 words, then 2, then 1
        const maxAnchorSize = Math.min(lineTokens.length, 3);

        for (let anchorSize = maxAnchorSize; anchorSize >= 1; anchorSize--) {
            const anchor = lineTokens.slice(0, anchorSize);

            // Search forward from last match
            for (let i = currentWordIdx; i <= transWords.length - anchorSize; i++) {
                let allMatch = true;
                for (let j = 0; j < anchorSize; j++) {
                    if (transWords[i + j].text !== anchor[j]) {
                        allMatch = false;
                        break;
                    }
                }

                if (allMatch) {
                    matchedTime = transWords[i].start / 1000;
                    currentWordIdx = i + 1;
                    break;
                }
            }

            if (matchedTime !== null) break;
        }

        synced.push({
            type: 'lyric',
            text: line,
            time: matchedTime
        });
    }

    return synced;
}
