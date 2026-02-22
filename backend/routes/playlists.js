const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Playlist = require('../models/Playlist');
const Song = require('../models/Song');
const { requireAuth } = require('../middleware/auth');

// All playlist routes require auth
router.use(requireAuth);

// ── GET /api/playlists ─────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const playlists = await Playlist.find({ owner: req.user._id })
            .populate('songs', 'title artist coverUrl duration audioUrl syncedLyrics lyricsType videoUrl')
            .sort({ createdAt: -1 });
        res.json({ success: true, playlists });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── POST /api/playlists ────────────────────────────────────────────────────────
router.post('/', [
    body('name').trim().isLength({ min: 1, max: 60 }).withMessage('Name required (max 60 chars)')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, error: errors.array()[0].msg });

    try {
        const playlist = await Playlist.create({ name: req.body.name, owner: req.user._id });
        res.status(201).json({ success: true, playlist });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── POST /api/playlists/:id/songs ──────────────────────────────────────────────
router.post('/:id/songs', async (req, res) => {
    try {
        const playlist = await Playlist.findOne({ _id: req.params.id, owner: req.user._id });
        if (!playlist) return res.status(404).json({ success: false, error: 'Playlist not found' });

        const { songId } = req.body;
        if (!songId) return res.status(400).json({ success: false, error: 'songId required' });

        // Avoid duplicates
        if (!playlist.songs.includes(songId)) {
            playlist.songs.push(songId);
            await playlist.save();
        }

        await playlist.populate('songs', 'title artist coverUrl duration audioUrl syncedLyrics lyricsType videoUrl');
        res.json({ success: true, playlist });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── DELETE /api/playlists/:id/songs/:songId ────────────────────────────────────
router.delete('/:id/songs/:songId', async (req, res) => {
    try {
        const playlist = await Playlist.findOne({ _id: req.params.id, owner: req.user._id });
        if (!playlist) return res.status(404).json({ success: false, error: 'Playlist not found' });

        playlist.songs = playlist.songs.filter(s => s.toString() !== req.params.songId);
        await playlist.save();
        res.json({ success: true, playlist });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── PUT /api/playlists/:id/reorder ─────────────────────────────────────────────
router.put('/:id/reorder', async (req, res) => {
    try {
        const playlist = await Playlist.findOne({ _id: req.params.id, owner: req.user._id });
        if (!playlist) return res.status(404).json({ success: false, error: 'Playlist not found' });

        const { songs } = req.body;
        if (!Array.isArray(songs)) return res.status(400).json({ success: false, error: 'songs array required' });

        playlist.songs = songs;
        await playlist.save();
        await playlist.populate('songs', 'title artist coverUrl duration audioUrl syncedLyrics lyricsType videoUrl');
        res.json({ success: true, playlist });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── PATCH /api/playlists/:id ───────────────────────────────────────────────────
router.patch('/:id', [
    body('name').trim().isLength({ min: 1, max: 60 }).withMessage('Name required (max 60 chars)')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, error: errors.array()[0].msg });

    try {
        const playlist = await Playlist.findOneAndUpdate(
            { _id: req.params.id, owner: req.user._id },
            { name: req.body.name },
            { new: true }
        );
        if (!playlist) return res.status(404).json({ success: false, error: 'Playlist not found' });
        res.json({ success: true, playlist });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── DELETE /api/playlists/:id ──────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
    try {
        const playlist = await Playlist.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
        if (!playlist) return res.status(404).json({ success: false, error: 'Playlist not found' });
        res.json({ success: true, message: 'Playlist deleted' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
