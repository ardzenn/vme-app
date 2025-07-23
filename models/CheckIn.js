const mongoose_checkin = require('mongoose');
const { Schema: Schema_checkin } = mongoose_checkin;

const checkInSchema = new Schema_checkin({
  user: { type: Schema_checkin.Types.ObjectId, ref: 'User', required: true },
  hospital: { type: Schema_checkin.Types.ObjectId, ref: 'Hospital', required: true },
  doctor: { type: Schema_checkin.Types.ObjectId, ref: 'Doctor', required: true },
  activity: { type: String, required: true },
  
  // Stores the path to an uploaded file OR a base64 data URL from the camera
  proof: { type: String }, 
  
  // Stores the base64 data URL from the signature pad
  signature: { type: String }, 
  
  // Stores the location data
  location: { 
    lat: Number, 
    lng: Number,
    timestamp: { type: Date, default: Date.now } 
  }
}, { timestamps: true });

module.exports = mongoose_checkin.models.CheckIn || mongoose_checkin.model('CheckIn', checkInSchema);
