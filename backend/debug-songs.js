require('dotenv').config();
const mongoose = require('mongoose');
const Song = require('./models/Song');
const Playlist = require('./models/Playlist');

async function debug() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const allSongs = await Song.find({}).sort({ title: 1 });
        console.log(`Total songs in DB: ${allSongs.length}`);

        allSongs.forEach(s => {
            console.log(`- [${s._id}] ${s.title} (${s.artist}) | Lyrics: ${s.syncedLyrics?.length || 0} | Type: ${s.lyricsType}`);
        });

        const playlists = await Playlist.find({ name: /ye/i }).populate('songs');
        console.log(`\nPlaylist [ye] contents:`);
        playlists.forEach(p => {
            p.songs.forEach(s => {
                console.log(`  * ${s.title} [${s._id}] | Lyrics: ${s.syncedLyrics?.length || 0}`);
            });
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debug();
