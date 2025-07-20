const mongoose = require('mongoose');

module.exports = mongoose.model('Collection', new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  file: { type: String, required: true },
  type: { type: String, enum: ['Invoice', 'Bill', 'Other'], required: true },
  timestamp: { type: Date, default: Date.now }
}));