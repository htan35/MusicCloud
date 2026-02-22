const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const { AssemblyAI } = require('assemblyai');
const Song = require('../models/Song');
const { requireAuth } = require('../middleware/auth');
const { extractKeyWords, alignLyrics } = require('../utils/lyricsHelper');

// AssemblyAI client setup (using env key)
const assemblyClient = new AssemblyAI({
    apiKey: process.env.ASSEMBLYAI_API_KEY
});

const router = express.Router();
router.use(requireAuth);

// ── Helper: search Genius for a song ──────────────────────────────────────────
async function searchGenius(query) {
    const searchUrl = `https://genius.com/api/search/multi?per_page=5&q=${encodeURIComponent(query)}`;
    const { data } = await axios.get(searchUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
    });

    const hits = data?.response?.sections
        ?.find(s => s.type === 'song')?.hits || [];

    return hits.map(h => ({
        id: h.result.id,
        title: h.result.title,
        artist: h.result.primary_artist?.name || 'Unknown',
        url: h.result.url,
        thumbnail: h.result.song_art_image_thumbnail_url
    }));
}

// ── Helper: scrape lyrics from a Genius URL ───────────────────────────────────
async function scrapeGeniusLyrics(url) {
    const { data: html } = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 15000
    });

    const $ = cheerio.load(html);

    // Genius uses data-lyrics-container="true" divs
    let lyrics = '';
    $('[data-lyrics-container="true"]').each((_, el) => {
        // Replace <br> with newlines before extracting text
        $(el).find('br').replaceWith('\n');
        // Remove interactive elements that might bleed into text
        $(el).find('script, style, iframe, button').remove();
        const text = $(el).text();
        lyrics += text + '\n';
    });

    // Clean up: split into lines, trim, and remove noise
    let lines = lyrics.split('\n').map(l => l.trim());

    // ── Genius Noise Removal ──────────────────────────────────────────────────
    // Often Genius headers like "11 Contributions" or "Lyrics" bleed in.
    // We look for the first section tag [Intro], [Verse], etc.
    const firstSectionIdx = lines.findIndex(l => /^\[.*\]$/.test(l));

    if (firstSectionIdx > -1 && firstSectionIdx < 20) {
        // Check if lines before the first section are metadata/noise
        const preamble = lines.slice(0, firstSectionIdx).join(' ').toLowerCase();
        if (preamble.length < 200 && (preamble.includes('contribution') || preamble.includes('viewer') || preamble.includes('lyrics'))) {
            lines = lines.slice(firstSectionIdx);
        }
    }

    // Double check the very first line for "Lyrics [Intro]" or similar merges
    if (lines.length > 0) {
        // Remove anything before the first [ if it's on the first line
        // This catches "24 Lyrics[Intro]", "Lyrics[Verse]", "11 Contributions Lyrics [Intro]" etc.
        if (lines[0].includes('[')) {
            lines[0] = lines[0].replace(/^.*(?=\[)/, '').trim();
        }
    }

    // Final join and trim
    return lines
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    return lyrics;
}

// ── GET /api/lyrics/search?q=... ──────────────────────────────────────────────
router.get('/search', async (req, res) => {
    const q = req.query.q;
    if (!q) return res.status(400).json({ success: false, error: 'Query required' });

    try {
        const results = await searchGenius(q);
        res.json({ success: true, results });
    } catch (err) {
        console.error('Genius search error:', err.message);
        res.status(502).json({ success: false, error: 'Failed to search Genius' });
    }
});

// ── POST /api/lyrics/scrape ───────────────────────────────────────────────────
router.post('/scrape', async (req, res) => {
    const { url } = req.body;
    if (!url || !url.includes('genius.com')) {
        return res.status(400).json({ success: false, error: 'Valid Genius URL required' });
    }

    try {
        const lyrics = await scrapeGeniusLyrics(url);
        if (!lyrics) {
            return res.status(404).json({ success: false, error: 'No lyrics found on page' });
        }
        res.json({ success: true, lyrics });
    } catch (err) {
        console.error('Genius scrape error:', err.message);
        res.status(502).json({ success: false, error: 'Failed to scrape lyrics' });
    }
});

// ── POST /api/lyrics/save/:songId ─────────────────────────────────────────────
router.post('/save/:songId', async (req, res) => {
    const { lyrics } = req.body;
    if (!lyrics || typeof lyrics !== 'string') {
        return res.status(400).json({ success: false, error: 'lyrics string required' });
    }

    try {
        const song = await Song.findById(req.params.songId);
        if (!song) return res.status(404).json({ success: false, error: 'Song not found' });

        // Save as plain lyrics (not synced — Genius doesn't provide timestamps)
        const lines = lyrics.split('\n').filter(l => l.trim());
        const duration = song.duration || 180;
        const interval = duration / (lines.length || 1);

        // Create basic timed lyrics (evenly spaced) for display
        const syncedLyrics = lines.map((text, i) => ({
            time: i * interval,
            text: text.trim(),
            section: text.startsWith('[') && text.endsWith(']')
                ? text.replace(/[[\]]/g, '') : undefined
        }));

        // Filter out section-only lines from synced but keep section tags
        const processedLyrics = [];
        let currentSection = null;
        for (const line of syncedLyrics) {
            if (line.section) {
                currentSection = line.section;
                continue; // skip section header lines from lyrics display
            }
            processedLyrics.push({
                time: line.time,
                text: line.text,
                section: currentSection
            });
        }

        song.rawLyrics = lyrics;
        song.syncedLyrics = processedLyrics.length > 0 ? processedLyrics : syncedLyrics;
        song.lyricsType = 'plain';
        await song.save();

        res.json({ success: true, song });
    } catch (err) {
        console.error('Save lyrics error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── POST /api/lyrics/sync/:songId ─────────────────────────────────────────────
// Use AI (AssemblyAI) to perfectly sync lyrics with audio
router.post('/sync/:songId', async (req, res) => {
    try {
        const song = await Song.findById(req.params.songId);
        if (!song) return res.status(404).json({ success: false, error: 'Song not found' });

        const lyrics = req.body.lyrics || song.rawLyrics;
        if (!lyrics) return res.status(400).json({ success: false, error: 'No lyrics available to sync' });

        if (!process.env.ASSEMBLYAI_API_KEY) {
            return res.status(500).json({
                success: false,
                error: 'AI Sync not configured. Please add ASSEMBLYAI_API_KEY to server .env'
            });
        }

        console.log(`🎙️ Starting AI Sync for: ${song.title}`);

        // 1. Transcribe audio with AssemblyAI
        const transcript = await assemblyClient.transcripts.transcribe({
            audio_url: song.url,
            word_boost: extractKeyWords(lyrics),
            boost_param: 'high',
        });

        if (transcript.status === 'error') {
            throw new Error(`AssemblyAI Transcription failed: ${transcript.error}`);
        }

        // 2. Align lyrics with transcribed words
        const syncedLyrics = alignLyrics(lyrics, transcript.words || []);

        // 3. Post-process to merge section info (same as manual save)
        const processedLyrics = [];
        let currentSection = null;
        for (const line of syncedLyrics) {
            if (line.type === 'section') {
                currentSection = line.label.replace(/[[\]]/g, '');
                continue;
            }
            processedLyrics.push({
                time: line.time,
                text: line.text,
                section: currentSection
            });
        }

        // 4. Update song record
        song.syncedLyrics = processedLyrics;
        song.lyricsType = 'synced';
        song.rawLyrics = lyrics;
        await song.save();

        console.log(`✅ AI Sync complete for: ${song.title}`);
        res.json({ success: true, song });

    } catch (err) {
        console.error('AI Sync error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
