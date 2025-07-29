const mongoose = require('mongoose');
const { Schema } = mongoose;

const hospitalSchema = new Schema({
    name: { 
        type: String, 
        required: true, 
        trim: true 
    },
    // Track who created the hospital entry
    createdBy: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    }
}, { timestamps: true });

// Ensure a user cannot add the same hospital name twice
hospitalSchema.index({ name: 1, createdBy: 1 }, { unique: true });

module.exports = mongoose.models.Hospital || mongoose.model('Hospital', hospitalSchema);