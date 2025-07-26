const mongoose = require('mongoose');
const { Schema } = mongoose;

const checkInSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  hospital: { type: Schema.Types.ObjectId, ref: 'Hospital', required: true },
  doctor: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
  activity: { type: String, required: true },
  notes: { type: String },
  proof: { type: String }, 
  signature: { type: String }, 
  location: { 
    lat: Number, 
    lng: Number 
  },

  mapImageUrl: { type: String },

}, { timestamps: true });

// Add a 2dsphere index for geospatial queries in the future
checkInSchema.index({ location: '2dsphere' });

module.exports = mongoose.models.CheckIn || mongoose.model('CheckIn', checkInSchema);