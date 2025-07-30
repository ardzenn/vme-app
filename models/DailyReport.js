const mongoose = require('mongoose');
const { Schema } = mongoose;

const dailyReportSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reportDate: { type: Date, default: Date.now },
    lastClientVisited: { type: String },
    
    visitedCalls: [{
        hospital: String,
        doctor: String,
    }],

    callSummary: {
        hospitals: { type: Number, default: 0 },
        mds: { type: Number, default: 0 },
        pharmacists: { type: Number, default: 0 },
        accountingStaff: { type: Number, default: 0 },
    },

    accomplishments: { type: String },
    mtdNotes: { type: String },

    dailySales: [{
        client: String,
        amount: Number
    }],

    dailyCollections: {
        current: { type: Number, default: 0 },
        overdue: { type: Number, default: 0 }
    },
    
    expenses: {
        meal: { type: Number, default: 0 },
        transportation: { type: Number, default: 0 },
        toll: { type: Number, default: 0 },
        parking: { type: Number, default: 0 },
        lodging: { type: Number, default: 0 },
    },

    startingOdometer: { type: Number },
    endingOdometer: { type: Number },
    endingOdometerPhoto: { type: String },
    endingOdometerNote: { type: String },
    totalKmReading: { type: Number },

    attachments: [{ type: String }]
}, { timestamps: true });

module.exports = mongoose.model('DailyReport', dailyReportSchema);