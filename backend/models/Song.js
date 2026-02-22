const mongoose = require('mongoose');

const syncedLyricSchema = new mongoose.Schema({
    time: { type: Number, required: true }, // seconds
    text: { type: String, required: true },
    section: { type: String }
}, { _id: false });

const songSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    artist: { type: String, required: true, trim: true },
    album: { type: String, trim: true },
    audioUrl: { type: String, required: true },
    audioPublicId: { type: String },
    videoUrl: { type: String },
    videoPublicId: { type: String },
    coverUrl: { type: String },
    coverPublicId: { type: String },
    duration: { type: Number, default: 0 }, // seconds
    syncedLyrics: [syncedLyricSchema],
    rawLyrics: { type: String },
    lyricsType: { type: String, enum: ['lrc', 'plain', 'synced', 'sectioned', 'none'], default: 'none' },
    plays: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }
}, { timestamps: true });

module.exports = mongoose.model('Song', songSchema);
