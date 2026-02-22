const express = require('express');
const router = express.Router();
const multer = require('multer');
const { cloudinary } = require('../utils/cloudinary');
const { processLyrics } = require('../utils/lyrics');
const Song = require('../models/Song');
const User = require('../models/User');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');
const os = require('os');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 500 * 1024 * 1024 }
});

const uploadFields = upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'video', maxCount: 1 },
    { name: 'cover', maxCount: 1 }
]);

function uploadToCloudinary(buffer, options) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
            if (error) reject(error);
            else resolve(result);
        });
        stream.end(buffer);
    });
}

/**
 * GET /api/songs/upload-signature
 * Generates a signed upload signature for direct frontend-to-Cloudinary uploads.
 * Bypasses Vercel's 5MB payload limit.
 */
router.get('/upload-signature', requireAuth, (req, res) => {
    try {
        const timestamp = Math.round(new Date().getTime() / 1000);
        const folder = req.query.folder || 'musicplayer/audio';

        // Use cloudinary utility to sign parameters
        const signature = cloudinary.utils.api_sign_request(
            { timestamp, folder },
            process.env.CLOUDINARY_API_SECRET
        );

        res.json({
            success: true,
            signature,
            timestamp,
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            folder
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to generate signature' });
    }
});

/**
 * GET /api/songs — List all songs
 * If authenticated, adds isLiked field per song.
 */
router.get('/', optionalAuth, async (req, res) => {
    try {
        const { search, artist } = req.query;
        const filter = {};
        if (search) {
            filter.$or = [
                { title: new RegExp(search, 'i') },
                { artist: new RegExp(search, 'i') },
                { album: new RegExp(search, 'i') }
            ];
        }
        if (artist) filter.artist = new RegExp(artist, 'i');

        const songs = await Song.find(filter)
            .select('-rawLyrics')
            .sort({ createdAt: -1 });

        // Mark which songs the current user has liked
        const likedSet = new Set(
            req.user ? req.user.likedSongs.map(id => id.toString()) : []
        );

        const decorated = songs.map(s => ({
            ...s.toObject(),
            isLiked: likedSet.has(s._id.toString())
        }));

        res.json({ success: true, songs: decorated });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/songs/:id
 */
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const song = await Song.findById(req.params.id);
        if (!song) return res.status(404).json({ success: false, error: 'Song not found' });

        song.plays = (song.plays || 0) + 1;
        await song.save();

        const likedSet = new Set(
            req.user ? req.user.likedSongs.map(id => id.toString()) : []
        );
        res.json({
            success: true,
            song: { ...song.toObject(), isLiked: likedSet.has(song._id.toString()) }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/songs/:id/like — Toggle like (requires auth)
 */
router.post('/:id/like', requireAuth, async (req, res) => {
    try {
        const song = await Song.findById(req.params.id);
        if (!song) return res.status(404).json({ success: false, error: 'Song not found' });

        const user = req.user;
        const likedIndex = user.likedSongs.findIndex(id => id.toString() === song._id.toString());
        let liked;

        if (likedIndex === -1) {
            // Like
            user.likedSongs.push(song._id);
            song.likes = (song.likes || 0) + 1;
            liked = true;
        } else {
            // Unlike
            user.likedSongs.splice(likedIndex, 1);
            song.likes = Math.max((song.likes || 1) - 1, 0);
            liked = false;
        }

        await Promise.all([user.save(), song.save()]);
        res.json({ success: true, liked, likes: song.likes });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/songs — Upload a new song
 */
router.post('/', optionalAuth, uploadFields, async (req, res) => {
    let tempAudioPath = null;
    try {
        const {
            title, artist, album, lyrics, duration,
            audioUrl, audioPublicId,
            coverUrl, coverPublicId,
            videoUrl, videoPublicId
        } = req.body;

        if (!title || !artist) {
            return res.status(400).json({ success: false, error: 'Title and artist are required' });
        }

        // Validation: Must have EITHER a direct URL (from frontend upload) OR a file (from multer)
        if (!audioUrl && !req.files?.audio) {
            return res.status(400).json({ success: false, error: 'Audio file or URL is required' });
        }

        const songData = {
            title,
            artist,
            album,
            owner: req.user?._id || null
        };

        // 1. Process Audio
        if (audioUrl) {
            // Direct Upload path
            songData.audioUrl = audioUrl;
            songData.audioPublicId = audioPublicId;
            songData.duration = parseFloat(duration) || 0;
        } else {
            // Legacy Multer path
            const audioFile = req.files.audio[0];
            const audioResult = await uploadToCloudinary(audioFile.buffer, {
                folder: 'musicplayer/audio',
                resource_type: 'video',
                use_filename: true,
                public_id: `audio_${Date.now()}`
            });
            songData.audioUrl = audioResult.secure_url;
            songData.audioPublicId = audioResult.public_id;
            songData.duration = parseFloat(duration) || audioResult.duration || 0;
        }

        // 2. Process Cover
        if (coverUrl) {
            songData.coverUrl = coverUrl;
            songData.coverPublicId = coverPublicId;
        } else if (req.files?.cover) {
            const coverResult = await uploadToCloudinary(req.files.cover[0].buffer, {
                folder: 'musicplayer/covers',
                resource_type: 'image',
                transformation: [{ width: 800, height: 800, crop: 'fill' }]
            });
            songData.coverUrl = coverResult.secure_url;
            songData.coverPublicId = coverResult.public_id;
        }

        // 3. Process Video
        if (videoUrl) {
            songData.videoUrl = videoUrl;
            songData.videoPublicId = videoPublicId;
        } else if (req.files?.video) {
            const videoResult = await uploadToCloudinary(req.files.video[0].buffer, {
                folder: 'musicplayer/video',
                resource_type: 'video'
            });
            songData.videoUrl = videoResult.secure_url;
            songData.videoPublicId = videoResult.public_id;
        }

        // 4. Process lyrics (Async AI sync stays the same)
        if (lyrics && lyrics.trim()) {
            songData.rawLyrics = lyrics;
            // Only attempt AI sync if we have a buffer (not possible with direct URLs unless we fetch it, 
            // but we'll stick to basic lyrics for direct uploads for now or assume durations are passed)
            if (!audioUrl && req.files?.audio) {
                tempAudioPath = path.join(os.tmpdir(), `audio_${Date.now()}.mp3`);
                fs.writeFileSync(tempAudioPath, req.files.audio[0].buffer);
                const { syncedLyrics, lyricsType } = await processLyrics(lyrics, songData.duration, tempAudioPath);
                songData.syncedLyrics = syncedLyrics;
                songData.lyricsType = lyricsType;
            } else {
                // If it's a direct URL, we just store as plain/synced if formatted
                songData.lyricsType = lyrics.includes('[00:') ? 'lrc' : 'plain';
            }
        }

        const song = await Song.create(songData);
        res.status(201).json({ success: true, song });
    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        if (tempAudioPath && fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);
    }
});

/**
 * PATCH /api/songs/:id — Update song metadata & cover art
 */
router.patch('/:id', optionalAuth, uploadFields, async (req, res) => {
    try {
        const song = await Song.findById(req.params.id);
        if (!song) return res.status(404).json({ success: false, error: 'Song not found' });

        const allowed = ['title', 'artist', 'album'];
        allowed.forEach(k => { if (req.body[k] !== undefined) song[k] = req.body[k]; });

        // Update cover art if provided
        if (req.files?.cover) {
            // Delete old cover from Cloudinary
            if (song.coverPublicId) {
                await cloudinary.uploader.destroy(song.coverPublicId).catch(() => { });
            }

            const coverResult = await uploadToCloudinary(req.files.cover[0].buffer, {
                folder: 'musicplayer/covers',
                resource_type: 'image',
                transformation: [{ width: 800, height: 800, crop: 'fill' }]
            });
            console.log('Cloudinary cover upload result:', coverResult.secure_url);
            song.coverUrl = coverResult.secure_url;
            song.coverPublicId = coverResult.public_id;
        }

        await song.save();
        console.log('Song saved with coverUrl:', song.coverUrl);
        res.json({ success: true, song });
    } catch (err) {
        console.error('Update error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * DELETE /api/songs/:id
 */
router.delete('/:id', async (req, res) => {
    try {
        const song = await Song.findById(req.params.id);
        if (!song) return res.status(404).json({ success: false, error: 'Song not found' });

        const deletes = [];
        if (song.audioPublicId) deletes.push(cloudinary.uploader.destroy(song.audioPublicId, { resource_type: 'video' }));
        if (song.videoPublicId) deletes.push(cloudinary.uploader.destroy(song.videoPublicId, { resource_type: 'video' }));
        if (song.coverPublicId) deletes.push(cloudinary.uploader.destroy(song.coverPublicId));
        await Promise.allSettled(deletes);

        await song.deleteOne();
        res.json({ success: true, message: 'Song deleted' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
