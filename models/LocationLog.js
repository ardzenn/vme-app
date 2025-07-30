const mongoose = require('mongoose');
const { Schema } = mongoose;

const locationLogSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  coordinates: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
  address: { type: String },
  accuracy: { type: Number },
  source: { type: String, default: 'foreground' }, // or 'background'
  createdAt: { type: Date, default: Date.now }
});

locationLogSchema.index({ coordinates: '2dsphere' });

module.exports = mongoose.model('LocationLog', locationLogSchema);
