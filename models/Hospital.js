const mongoose = require('mongoose');

module.exports = mongoose.model('Hospital', new mongoose.Schema({
  name: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}));