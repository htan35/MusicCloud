require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');

const authRoutes = require('./routes/auth');
const songRoutes = require('./routes/songs');
const playlistRoutes = require('./routes/playlists');
const lyricsRoutes = require('./routes/lyrics');

const app = express();

// ── Security headers ───────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// ── CORS ───────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    // Allow if no origin (mobile apps, curl) or if it's localhost/local network
    if (!origin ||
      origin === 'http://localhost' ||
      origin === 'capacitor://localhost' ||
      origin.includes('localhost:3000') ||
      origin.startsWith('http://192.168.')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ── Rate limiting ──────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Very relaxed in dev
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== 'production', // Skip entirely in dev
  message: { success: false, error: 'Too many login attempts, please try again in 15 minutes' }
});

app.use(globalLimiter);
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/lyrics', lyricsRoutes);

app.get('/health', (req, res) => res.json({
  status: 'ok',
  time: new Date().toISOString()
}));

// ── Serve Frontend in Production ─────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(distPath));

  // Catch-all route for SPA
  app.get('*', (req, res, next) => {
    // If it's an API route that wasn't found, should still 404
    if (req.url.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ── 404 handler ────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ── Global error handler ───────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ── MongoDB ────────────────────────────────────────────────────────────────────
let dbMode = 'unknown';

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  const isRealAtlas = uri && uri.includes('mongodb+srv://') && !uri.includes('your_');

  if (isRealAtlas) {
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔗 Connecting to MongoDB Atlas (attempt ${attempt}/${maxRetries})...`);
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
        dbMode = 'atlas';
        console.log('✅ MongoDB Atlas connected — data will persist across restarts');
        return;
      } catch (err) {
        console.warn(`⚠️  Atlas attempt ${attempt} failed: ${err.message}`);
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 2000 * attempt));
        }
      }
    }
    console.error('❌ All Atlas connection attempts failed.');
    console.warn('⚠️  Falling back to embedded MongoDB — DATA WILL BE LOST ON RESTART');
  }

  const { MongoMemoryServer } = require('mongodb-memory-server');
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  dbMode = 'memory';
  console.log('⚠️  Embedded MongoDB started — DATA IS TEMPORARY (lost on restart)');
}

connectDB().catch(err => {
  console.error('❌ MongoDB fatal error:', err.message);
  process.exit(1);
});

// ── Export/Run ────────────────────────────────────────────────────────────────
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🎵 MusicCloud server running on port ${PORT}`);
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change-this-secret-in-production') {
      console.warn('⚠️  JWT_SECRET not set in .env — using insecure default. Set a strong secret in production!');
    }
  });
}

module.exports = app;
