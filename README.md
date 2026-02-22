# MusicCloud 🎵

A Spotify-like music player with **synced karaoke lyrics** and **optional video mode**, built with React + Node.js + MongoDB + Cloudinary.

## Features

- 🎵 **Audio player** — play/pause, seek bar, volume, skip
- 🎬 **Video mode** — seamless switch at the same playback position
- 📝 **Synced lyrics** — karaoke-style highlight with smooth scroll; click any line to seek
- ☁️ **Cloud storage** — audio, video, and cover images stored on Cloudinary
- 📤 **Drag-and-drop upload** — supports MP3, WAV, FLAC, MP4, JPEG, PNG, and `.lrc` files
- 🔍 **Search** — filter songs by title, artist, or album

## Quick Start

### 1. Prerequisites

- Node.js 18+
- MongoDB running locally (or use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))
- [Cloudinary](https://cloudinary.com/) free account

### 2. Backend

```powershell
cd backend
copy .env.example .env
# Edit .env with your Cloudinary credentials and MongoDB URI
npm install
npm run dev
# → http://localhost:5000/health
```

### 3. Frontend

```powershell
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

## Folder Structure

```
MusicCloud/
├── backend/
│   ├── models/Song.js          # Mongoose schema
│   ├── routes/songs.js         # CRUD + upload API
│   ├── utils/cloudinary.js     # Cloudinary SDK init
│   ├── utils/lyrics.js         # LRC parser + Aeneas runner
│   ├── server.js               # Express entry point
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/         # All React UI components
│   │   ├── context/            # PlayerContext (global state)
│   │   └── utils/              # api.js, format.js
│   ├── index.html
│   └── vite.config.js
└── docker-compose.yml          # Full-stack Docker deployment
```

## Docker (Production)

```powershell
# Set env vars first
$env:CLOUDINARY_CLOUD_NAME="your_cloud_name"
$env:CLOUDINARY_API_KEY="your_api_key"
$env:CLOUDINARY_API_SECRET="your_api_secret"

docker compose up --build
# Frontend: http://localhost:3000
# Backend:  http://localhost:5000
```

## Lyrics Format

**Option A — LRC** (auto-synced):
```lrc
[00:12.00] I see trees of green
[00:15.50] Red roses too
```

**Option B — Plain text** (evenly distributed across song duration):
```
I see trees of green
Red roses too
I see them bloom
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Node.js, Express, Multer |
| Database | MongoDB, Mongoose |
| Storage | Cloudinary |
| Lyrics Sync | LRC parser + Aeneas (optional) |
| Docker | Node 20, Nginx, MongoDB 7 |
