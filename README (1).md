# 🎵 Aura — Full-Stack Music Player

A production-ready Spotify-like music player with synced lyrics, video mode, and Cloudinary storage.

---

## ✨ Features

- **Upload**: Audio, album cover, optional music video
- **Lyrics**: LRC timestamp parsing OR plain text → auto-synced timestamps (Aeneas forced alignment when available)
- **Player**: Play/pause, seek, volume, queue navigation
- **Synced Lyrics**: Smooth scrolling with animated highlight, click-to-seek
- **Video Mode**: Seamless audio↔video switch maintaining exact playback time (no reload)
- **Library**: Search, delete, play count

---

## 🏗 Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Tailwind CSS, Context API |
| Backend | Node.js, Express |
| Database | MongoDB (Mongoose) |
| Storage | Cloudinary (audio, video, images) |
| Alignment | Aeneas (optional, Python) |

---

## 🚀 Quick Start (Development)

### 1. Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Cloudinary account (free tier works)

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Fill in your Cloudinary credentials in .env
npm install
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm start
```

App runs at `http://localhost:3000`, API at `http://localhost:5000`.

---

## 🐳 Docker (Production)

```bash
# Create .env with your Cloudinary credentials
cp .env.example .env

docker-compose up -d
```

App: `http://localhost:3000`

---

## 🌍 Environment Variables

```env
# backend/.env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/musicplayer
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
FRONTEND_URL=http://localhost:3000
```

---

## 🎙 Forced Alignment (Aeneas)

When Aeneas is installed, plain-text lyrics are automatically aligned with audio using speech recognition.

**Install Aeneas:**

```bash
# Ubuntu/Debian
apt-get install python3 ffmpeg espeak
pip3 install aeneas

# macOS
brew install ffmpeg espeak
pip3 install aeneas
```

**Without Aeneas:** Timestamps are evenly distributed across the song duration as a fallback — lyrics still scroll and highlight, just less precisely.

---

## 📁 Project Structure

```
musicplayer/
├── backend/
│   ├── models/
│   │   └── Song.js          # MongoDB schema
│   ├── routes/
│   │   └── songs.js         # REST API routes
│   ├── utils/
│   │   ├── cloudinary.js    # Cloudinary config
│   │   └── lyrics.js        # LRC parser + Aeneas
│   ├── server.js
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AudioEngine.jsx    # Hidden audio element + events
│   │   │   ├── Library.jsx        # Song list + search + upload
│   │   │   ├── LyricsPanel.jsx    # Synced scrolling lyrics
│   │   │   ├── NowPlaying.jsx     # Album art, video, lyrics
│   │   │   ├── PlayerControls.jsx # Bottom player bar
│   │   │   ├── SongCard.jsx       # Individual song row
│   │   │   ├── UploadModal.jsx    # Upload form with drag & drop
│   │   │   └── VideoPlayer.jsx    # Video element + sync
│   │   ├── context/
│   │   │   └── PlayerContext.jsx  # Global player state
│   │   └── utils/
│   │       ├── api.js            # Axios API client
│   │       └── format.js         # Time formatting
│   └── Dockerfile
│
└── docker-compose.yml
```

---

## 🎛 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/songs` | List all songs |
| GET | `/api/songs/:id` | Get song + increment plays |
| POST | `/api/songs` | Upload song (multipart/form-data) |
| PATCH | `/api/songs/:id` | Update metadata |
| DELETE | `/api/songs/:id` | Delete song + Cloudinary assets |

### Upload Payload (multipart/form-data)

| Field | Type | Required |
|-------|------|----------|
| `title` | string | ✅ |
| `artist` | string | ✅ |
| `album` | string | — |
| `lyrics` | string | — |
| `audio` | file | ✅ |
| `cover` | file | — |
| `video` | file | — |

---

## 🗄 Database Schema

```js
Song {
  title: String,        // required
  artist: String,       // required
  album: String,
  audioUrl: String,     // Cloudinary URL
  videoUrl: String,     // optional
  coverUrl: String,     // optional
  duration: Number,     // seconds
  syncedLyrics: [{
    time: Number,       // seconds from start
    text: String        // lyric line
  }],
  rawLyrics: String,
  lyricsType: 'lrc' | 'plain' | 'synced' | 'none',
  plays: Number,
  createdAt: Date
}
```

---

## 🎨 UI Design

Dark aesthetic with aurora color palette:
- **Obsidian** backgrounds (`#07060d` → `#2a2444`)
- **Aurora Pink** (`#ff3fa4`) — primary accents
- **Aurora Violet** (`#9b5de5`) — secondary accents  
- **Aurora Cyan** (`#00f5d4`) — metadata badges
- **Playfair Display** — display headings
- **DM Sans** — body text
- **JetBrains Mono** — timestamps, metadata

---

## 📝 LRC Format Example

```lrc
[00:12.00] First line of the song
[00:15.50] Second line here
[00:20.00] The chorus begins now
```

Plain text (no timestamps) is also accepted — lines get evenly distributed timestamps.
