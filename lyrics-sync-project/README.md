# 🎵 Lyrics Sync AI

Automatically sync your lyrics to an MP3 file using AI.
Built with React, Node.js/Express, MongoDB, Cloudinary, and AssemblyAI.

---

## How It Works

1. User uploads an MP3 + pastes lyrics (with `[Verse 1]`, `[Chorus]` labels)
2. MP3 is uploaded to **Cloudinary**
3. **AssemblyAI** transcribes the audio with word-level timestamps
4. Lyrics are **aligned** to the transcribed words
5. Results saved to **MongoDB** and returned as synced lyrics + `.lrc` file

---

## Free Services Used

| Service | What For | Free Tier |
|---|---|---|
| Cloudinary | Store MP3 files | 25GB storage |
| MongoDB Atlas | Store sync jobs | 512MB |
| AssemblyAI | AI transcription | 100 hrs free |

---

## Setup

### 1. Get Your API Keys

- **Cloudinary**: https://cloudinary.com → Dashboard → Copy cloud name, API key, secret
- **MongoDB Atlas**: https://mongodb.com/atlas → Create free cluster → Get connection string
- **AssemblyAI**: https://assemblyai.com → Sign up → Copy API key (100hrs free)

---

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Fill in your keys in .env
npm run dev
```

Backend runs on: http://localhost:3001

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm start
```

Frontend runs on: http://localhost:3000

The frontend proxies `/api` requests to `localhost:3001` automatically (set in package.json).

---

## Project Structure

```
lyrics-sync-project/
├── backend/
│   ├── models/
│   │   └── SyncJob.js          ← MongoDB schema
│   ├── routes/
│   │   └── syncLyrics.js       ← API routes (POST, GET, DELETE)
│   ├── utils/
│   │   └── lyricsHelper.js     ← AI alignment logic
│   ├── server.js               ← Express entry point
│   ├── .env.example            ← Copy to .env and fill in keys
│   └── package.json
│
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── components/
    │   │   ├── SyncLyrics.jsx  ← Main UI component
    │   │   └── SyncLyrics.css  ← Styles
    │   ├── App.js
    │   └── index.js
    └── package.json
```

---

## API Endpoints

| Method | URL | Description |
|---|---|---|
| POST | `/api/sync-lyrics` | Upload MP3 + lyrics, returns synced result |
| GET | `/api/sync-lyrics/:jobId` | Get a previous result by ID |
| GET | `/api/sync-lyrics` | List all past jobs |
| DELETE | `/api/sync-lyrics/:jobId` | Delete a job |

### POST /api/sync-lyrics

Form data:
- `mp3` — audio file
- `lyrics` — lyrics text with section labels
- `songName` — (optional) name of the song

Response:
```json
{
  "jobId": "...",
  "songName": "My Song",
  "syncedLyrics": [
    { "type": "section", "label": "[Intro]", "time": null },
    { "type": "lyric", "text": "First line", "time": 4.32 }
  ],
  "lrcContent": "[00:04.32] First line\n...",
  "mp3Url": "https://res.cloudinary.com/...",
  "totalLines": 24,
  "matchedLines": 22
}
```

---

## Embedding Into Your Existing Website

Just copy `SyncLyrics.jsx` and `SyncLyrics.css` into your existing React project
and import the component wherever you need it:

```jsx
import SyncLyrics from './components/SyncLyrics';

// Use anywhere in your app
<SyncLyrics />
```

And add the backend routes to your existing Express server:

```js
import syncLyricsRouter from './routes/syncLyrics.js';
app.use('/api/sync-lyrics', syncLyricsRouter);
```

---

## Lyrics Format

```
[Intro]
First line of intro
Second line

[Verse 1]
Verse line one
Verse line two
Verse line three

[Chorus]
Chorus line one
Chorus line two

[Bridge]
Bridge line here
```

- Section labels must be in `[brackets]` on their own line
- Each lyric line on a new line
- Blank lines between sections are optional
