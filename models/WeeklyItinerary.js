// in models/WeeklyItinerary.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const commentSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const dailyItinerarySchema = new Schema({
    date: { type: Date, required: true },
    area: { type: String },
    salesObjectives: [{ client: String, amount: Number }],
    collectionObjectives: [{ client: String, amount: Number }],
    placesToVisit: [{ place: String, doctors: [String] }]
});

const weeklyItinerarySchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    weekStartDate: { type: Date, required: true }, // The Monday of the week
    dailyPlans: [dailyItinerarySchema],
    totalTargetSales: { type: Number },
    totalTargetCollections: { type: Number },
    comments: [commentSchema]
}, { timestamps: true });

weeklyItinerarySchema.index({ user: 1, weekStartDate: 1 }, { unique: true });

module.exports = mongoose.model('WeeklyItinerary', weeklyItinerarySchema);