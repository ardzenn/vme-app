const mongoose = require('mongoose');

const directMessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('DirectMessage', directMessageSchema);