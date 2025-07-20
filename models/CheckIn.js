const mongoose = require('mongoose');

module.exports = mongoose.model('CheckIn', new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  proof: { type: String },
  activity: { type: String, required: true },
  location: { lat: Number, lng: Number, timestamp: { type: Date, default: Date.now } }
}));