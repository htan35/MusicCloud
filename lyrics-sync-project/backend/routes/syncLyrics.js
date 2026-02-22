import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { AssemblyAI } from 'assemblyai';
import SyncJob from '../models/SyncJob.js';
import { extractKeyWords, alignLyrics, generateLRC } from '../utils/lyricsHelper.js';

const router = express.Router();

// Multer: store file in memory (then stream to Cloudinary)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  }
});

// AssemblyAI client
const assemblyClient = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY
});

// ─────────────────────────────────────────────────────────────
// POST /api/sync-lyrics
// Upload MP3 + lyrics → transcribe → align → return synced data
// ─────────────────────────────────────────────────────────────
router.post('/', upload.single('mp3'), async (req, res) => {
  let job = null;

  try {
    const { lyrics, songName } = req.body;
    const mp3File = req.file;

    // ── Validate inputs ──
    if (!mp3File) {
      return res.status(400).json({ error: 'MP3 file is required' });
    }
    if (!lyrics || !lyrics.trim()) {
      return res.status(400).json({ error: 'Lyrics are required' });
    }

    // Check for required environment variables
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.ASSEMBLYAI_API_KEY) {
      throw new Error('Server configuration error: Missing API keys (Cloudinary or AssemblyAI). Please check your .env file.');
    }

    // ── 1. Upload MP3 to Cloudinary ──
    console.log('📤 Uploading MP3 to Cloudinary...');
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'video', // 'video' handles audio files in Cloudinary
          folder: 'lyrics-sync/songs',
          public_id: `song_${Date.now()}`,
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary Upload Error:', error);
            reject(new Error(`Cloudinary upload failed: ${error.message}`));
          } else {
            resolve(result);
          }
        }
      );
      stream.end(mp3File.buffer);
    });

    console.log('✅ Uploaded to Cloudinary:', uploadResult.secure_url);

    // ── 2. Create job record in MongoDB ──
    job = await SyncJob.create({
      songName: songName || mp3File.originalname.replace('.mp3', ''),
      mp3Url: uploadResult.secure_url,
      mp3PublicId: uploadResult.public_id,
      originalLyrics: lyrics,
      status: 'processing'
    });

    // ── 3. Transcribe with AssemblyAI ──
    console.log('🎙️ Transcribing with AssemblyAI...');
    const transcript = await assemblyClient.transcripts.transcribe({
      audio_url: uploadResult.secure_url,
      word_boost: extractKeyWords(lyrics),  // improve accuracy with lyrics words
      boost_param: 'high',
    });

    if (transcript.status === 'error') {
      throw new Error(`AssemblyAI error: ${transcript.error}`);
    }

    console.log(`✅ Transcription done. Words found: ${transcript.words?.length}`);

    // ── 4. Align lyrics to transcribed words ──
    const syncedLyrics = alignLyrics(lyrics, transcript.words || []);

    // ── 5. Generate LRC file content ──
    const lrcContent = generateLRC(syncedLyrics);

    // ── 6. Save results to MongoDB ──
    job.syncedLyrics = syncedLyrics;
    job.lrcContent = lrcContent;
    job.status = 'done';
    await job.save();

    console.log('✅ Job done:', job._id);

    res.json({
      jobId: job._id,
      songName: job.songName,
      syncedLyrics,
      lrcContent,
      mp3Url: uploadResult.secure_url,
      totalLines: syncedLyrics.length,
      matchedLines: syncedLyrics.filter(l => l.time !== null).length
    });

  } catch (err) {
    console.error('❌ Sync failed:', err.message);

    // Update job status to failed
    if (job) {
      job.status = 'failed';
      job.errorMessage = err.message;
      await job.save();
    }

    res.status(500).json({ error: err.message || 'Lyrics sync failed' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/sync-lyrics/:jobId
// Fetch a previous sync result by job ID
// ─────────────────────────────────────────────────────────────
router.get('/:jobId', async (req, res) => {
  try {
    const job = await SyncJob.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/sync-lyrics
// Get all sync jobs (history)
// ─────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const jobs = await SyncJob.find()
      .sort({ createdAt: -1 })
      .select('songName status createdAt totalLines mp3Url');
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/sync-lyrics/:jobId
// Delete a job and its Cloudinary file
// ─────────────────────────────────────────────────────────────
router.delete('/:jobId', async (req, res) => {
  try {
    const job = await SyncJob.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Delete from Cloudinary
    if (job.mp3PublicId) {
      await cloudinary.uploader.destroy(job.mp3PublicId, { resource_type: 'video' });
    }

    await job.deleteOne();
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

export default router;
