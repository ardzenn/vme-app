const mongoose = require('mongoose');
const { Schema } = mongoose;

const transactionSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['Collection', 'Deposit'], required: true },
    
    // Collection Fields
    customer: { type: String },
    dateCollected: { type: Date },
    prCr: { type: String }, 
    siDr: { type: String }, 
    dateOfCheck: { type: Date },
    bankCheckNo: { type: String },
    amount: { type: Number }, 

    // Deposit Fields
    details: { type: String },
    hospital: { type: String },
    dateDeposited: { type: Date },
    paymentMethod: { type: String, enum: ['Cheque', 'Cash'] },
    totalAmountDeposited: { type: Number },

    // Common Fields
    note: { type: String }, // New Note Field
    attachmentUrl: { type: String }, // No longer required
    remarks: { type: String },
    comments: [{
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        text: String,
        attachmentUrl: String,
        createdAt: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

module.exports = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);