const mongoose = require('mongoose');
const { Schema } = mongoose;

const commentSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const salesObjectiveSchema = new Schema({
    client: String,
    amount: Number
});

const collectionObjectiveSchema = new Schema({
    client: String,
    amount: Number
});

const placeToVisitSchema = new Schema({
    place: String,
    doctors: [String]
});

const dailyItinerarySchema = new Schema({
    date: { type: Date },
    area: { type: String },
    salesObjectives: [salesObjectiveSchema],
    collectionObjectives: [collectionObjectiveSchema],
    placesToVisit: [placeToVisitSchema]
});

const weeklyItinerarySchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    weekStartDate: { type: Date, required: true },
    weekPeriod: { type: String },
    dailyPlans: [dailyItinerarySchema],
    totalTargetSales: { type: Number, default: 0 },
    totalTargetCollections: { type: Number, default: 0 },
    comments: [commentSchema]
}, { timestamps: true });

weeklyItinerarySchema.index({ user: 1, weekStartDate: 1 }, { unique: true });

module.exports = mongoose.model('WeeklyItinerary', weeklyItinerarySchema);
