import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';
import syncLyricsRouter from './routes/syncLyrics.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Cloudinary Config ───────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Middleware ──────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'DELETE'],
}));
app.use(express.json());

// ─── Routes ─────────────────────────────────────────────────
app.use('/api/sync-lyrics', syncLyricsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Lyrics Sync API is running 🎵' });
});

// ─── MongoDB + Start Server ──────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });
