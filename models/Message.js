const mongoose = require('mongoose');

module.exports = mongoose.model('Message', new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String },
  attachment: { type: String },
  timestamp: { type: Date, default: Date.now }
}));