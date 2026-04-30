const mongoose = require('mongoose');

const QuizResultSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  history:   { type: mongoose.Schema.Types.ObjectId, ref: 'History', required: true },
  title:     { type: String, default: '' },
  score:     { type: Number, required: true },   // correct answers count
  total:     { type: Number, required: true },   // total questions
  percent:   { type: Number, required: true },   // 0–100
  timeTaken: { type: Number, default: 0 },       // seconds
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('QuizResult', QuizResultSchema);
