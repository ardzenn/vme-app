const mongoose = require('mongoose');
const { Schema } = mongoose;

const doctorSchema = new Schema({
    name: { type: String, required: true, trim: true },
    hospital: { type: Schema.Types.ObjectId, ref: 'Hospital', required: true },
    // Track who created a new data in doctor
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Ensure a user cannot add the same doctor to the same hospital twice
doctorSchema.index({ name: 1, hospital: 1, createdBy: 1 }, { unique: true });

module.exports = mongoose.models.Doctor || mongoose.model('Doctor', doctorSchema);