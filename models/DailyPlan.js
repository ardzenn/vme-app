// in models/DailyPlan.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const commentSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const dailyPlanSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    planDate: { type: Date, required: true },
    firstClientCall: { type: String },
    areasToVisit: { type: String },
    placesToVisit: [{ type: String }],
    salesObjectives: [{ type: String }],
    targetCollections: {
        current: [{ client: String }],
        overdue: [{ client: String, si_dr: String, date: Date, amount: Number }]
    },
    comments: [commentSchema]
}, { timestamps: true });

dailyPlanSchema.index({ user: 1, planDate: 1 }, { unique: true }); // One plan per user per day

module.exports = mongoose.model('DailyPlan', dailyPlanSchema);