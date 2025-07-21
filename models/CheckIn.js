const mongoose = require('mongoose');

const checkInSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  proof: { type: String },
  activity: { type: String, required: true },
  signature: { type: String }, // <-- ADD THIS LINE
  location: { 
    lat: Number, 
    lng: Number, 
    timestamp: { type: Date, default: Date.now } 
  }
});

module.exports = mongoose.model('CheckIn', checkInSchema);