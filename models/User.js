const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  email:     { type: String, unique: true, required: true, lowercase: true },
  password:  { type: String, required: true },
  streak:    { type: Number, default: 0 },
  lastStudy: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
