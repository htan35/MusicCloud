const mongoose = require('mongoose');

const syncedLyricSchema = new mongoose.Schema({
  time: { type: Number, required: true }, // seconds
  text: { type: String, required: true }
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
  lyricsType: { type: String, enum: ['lrc', 'plain', 'synced', 'none'], default: 'none' },
  plays: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Song', songSchema);
