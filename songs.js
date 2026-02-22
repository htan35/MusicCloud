const express = require('express');
const router = express.Router();
const multer = require('multer');
const { cloudinary } = require('../utils/cloudinary');
const { processLyrics } = require('../utils/lyrics');
const Song = require('../models/Song');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Use memory storage so we can pipe to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB max
});

const uploadFields = upload.fields([
  { name: 'audio', maxCount: 1 },
  { name: 'video', maxCount: 1 },
  { name: 'cover', maxCount: 1 }
]);

/**
 * Helper: Upload buffer to Cloudinary
 */
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
 * GET /api/songs - List all songs
 */
router.get('/', async (req, res) => {
  try {
    const { search, artist } = req.query;
    const filter = {};
    if (search) filter.$text = { $search: search };
    if (artist) filter.artist = new RegExp(artist, 'i');

    const songs = await Song.find(filter)
      .select('-rawLyrics')
      .sort({ createdAt: -1 });
    res.json({ success: true, songs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/songs/:id - Get single song with full lyrics
 */
router.get('/:id', async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ success: false, error: 'Song not found' });
    
    // Increment play count
    song.plays = (song.plays || 0) + 1;
    await song.save();
    
    res.json({ success: true, song });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/songs - Upload a new song
 */
router.post('/', uploadFields, async (req, res) => {
  let tempAudioPath = null;

  try {
    const { title, artist, album, lyrics, duration } = req.body;

    if (!title || !artist) {
      return res.status(400).json({ success: false, error: 'Title and artist are required' });
    }
    if (!req.files?.audio) {
      return res.status(400).json({ success: false, error: 'Audio file is required' });
    }

    const songData = { title, artist, album };

    // Upload audio
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

    // Upload cover
    if (req.files?.cover) {
      const coverResult = await uploadToCloudinary(req.files.cover[0].buffer, {
        folder: 'musicplayer/covers',
        resource_type: 'image',
        transformation: [{ width: 800, height: 800, crop: 'fill' }]
      });
      songData.coverUrl = coverResult.secure_url;
      songData.coverPublicId = coverResult.public_id;
    }

    // Upload video
    if (req.files?.video) {
      const videoResult = await uploadToCloudinary(req.files.video[0].buffer, {
        folder: 'musicplayer/video',
        resource_type: 'video'
      });
      songData.videoUrl = videoResult.secure_url;
      songData.videoPublicId = videoResult.public_id;
    }

    // Process lyrics
    if (lyrics && lyrics.trim()) {
      songData.rawLyrics = lyrics;

      // Write audio to temp file for Aeneas (if available)
      tempAudioPath = path.join(os.tmpdir(), `audio_${Date.now()}.mp3`);
      fs.writeFileSync(tempAudioPath, audioFile.buffer);

      const { syncedLyrics, lyricsType } = await processLyrics(
        lyrics,
        songData.duration,
        tempAudioPath
      );
      songData.syncedLyrics = syncedLyrics;
      songData.lyricsType = lyricsType;
    }

    const song = await Song.create(songData);
    res.status(201).json({ success: true, song });

  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (tempAudioPath && fs.existsSync(tempAudioPath)) {
      fs.unlinkSync(tempAudioPath);
    }
  }
});

/**
 * PATCH /api/songs/:id - Update song metadata
 */
router.patch('/:id', async (req, res) => {
  try {
    const allowed = ['title', 'artist', 'album', 'duration'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const song = await Song.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!song) return res.status(404).json({ success: false, error: 'Song not found' });
    res.json({ success: true, song });
  } catch (err) {
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

    // Delete from Cloudinary
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
