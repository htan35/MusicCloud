import mongoose from 'mongoose';

const SyncJobSchema = new mongoose.Schema({
  songName: {
    type: String,
    default: 'Untitled Song'
  },
  mp3Url: {
    type: String,
    required: true
  },
  mp3PublicId: {
    type: String  // Cloudinary public_id for deletion later
  },
  originalLyrics: {
    type: String,
    required: true
  },
  syncedLyrics: {
    type: Array,
    default: []
    // Each item: { type: 'lyric' | 'section', text: '', label: '', time: 0 }
  },
  lrcContent: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'done', 'failed'],
    default: 'pending'
  },
  errorMessage: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('SyncJob', SyncJobSchema);
