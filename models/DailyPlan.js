const mongoose = require('mongoose');
const { Schema } = mongoose;

const commentSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const salesObjectiveSchema = new Schema({
    objective: String,
    client: String,
    product: String
});

const currentCollectionSchema = new Schema({
    client: String,
    amount: Number
});

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
    itinerary: [String],
    salesObjectives: [salesObjectiveSchema],
    targetCollections: {
        current: [currentCollectionSchema],
        overdue: [overdueCollectionSchema]
    },
    comments: [commentSchema],
    // ADDED: A flag to track if the plan has been viewed by an admin.
    isNew: { type: Boolean, default: true }
}, { timestamps: true });

dailyPlanSchema.index({ user: 1, planDate: 1 }, { unique: true });

module.exports = mongoose.model('DailyPlan', dailyPlanSchema);