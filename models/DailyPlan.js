const mongoose = require('mongoose');
const { Schema } = mongoose;

// Schema for comments, can be reused.
const commentSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

// Schema for sales objectives, simplified to match the form.
const salesObjectiveSchema = new Schema({
    objective: String,
    // Kept for potential future use, but not on the main form.
    client: String,
    product: String
});

// Schema for current collections.
const currentCollectionSchema = new Schema({
    client: String,
    amount: Number
});

// NEW: A more detailed schema for overdue collections to match the form fields.
const overdueCollectionSchema = new Schema({
    client: String,
    siDrNumber: String,
    date: Date,
    amount: Number
});

const dailyPlanSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    planDate: { type: Date, required: true },
    firstClientCall: { type: String },
    areasToVisit: { type: String },
    itinerary: [String], // Used for "Hospitals & Capitol to Visit"
    salesObjectives: [salesObjectiveSchema],
    targetCollections: {
        current: [currentCollectionSchema],
        overdue: [overdueCollectionSchema] // Using the new, detailed schema
    },
    comments: [commentSchema]
}, { timestamps: true });

// A user can only have one plan per day.
dailyPlanSchema.index({ user: 1, planDate: 1 }, { unique: true });

module.exports = mongoose.model('DailyPlan', dailyPlanSchema);
