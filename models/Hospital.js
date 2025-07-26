const mongoose = require('mongoose');
const { Schema } = mongoose;

const hospitalSchema = new Schema({
    name: { type: String, required: true, trim: true },
    // to track who made a new data in hospital
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Ensure a user cannot add the same hospital twice
hospitalSchema.index({ name: 1, createdBy: 1 }, { unique: true });

module.exports = mongoose.models.Hospital || mongoose.model('Hospital', hospitalSchema);