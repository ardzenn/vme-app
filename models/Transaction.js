// in models/Transaction.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const commentSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String },
    attachmentUrl: { type: String },
    createdAt: { type: Date, default: Date.now }
});

const transactionSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['Collection', 'Deposit'], required: true },
    
    // Fields for Collection
    customer: { type: String },
    dateCollected: { type: Date },
    prCr: { type: String },
    siDr: { type: String },
    dateOfCheck: { type: Date },
    bankCheckNo: { type: String },
    amount: { type: Number },

    // Fields for Deposit
    details: { type: String },
    hospital: { type: String },
    dateDeposited: { type: Date },
    paymentMethod: { type: String, enum: ['Cheque', 'Cash'] },
    totalAmountDeposited: { type: Number },

    // Shared fields
    attachmentUrl: { type: String, required: true },
    comments: [commentSchema]
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);