const mongoose = require('mongoose');

const HistorySchema = new mongoose.Schema({
  user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:        { type: String, default: 'Untitled Notes' },
  originalText: { type: String, default: '' },
  summary:      { type: String, default: '' },
  keywords:     [String],
  mcqs:         [String],
  flashcards:   [String],
  difficulty:   { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  readability:  { type: Number, default: 0 },   // Flesch-Kincaid score
  wordCount:    { type: Number, default: 0 },
  createdAt:    { type: Date, default: Date.now }
});

module.exports = mongoose.model('History', HistorySchema);
