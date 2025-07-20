const mongoose = require('mongoose');

module.exports = mongoose.model('Doctor', new mongoose.Schema({
  name: { type: String, required: true },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}));