const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    customerName: { type: String, required: true },
    area: { type: String },
    hospital: { type: String },
    contactNumber: { type: String },
    email: { type: String },
    note: { type: String },
    products: [{
        product: String,
        quantity: Number,
        price: Number,
        total: Number
    }],
    subtotal: { type: Number, required: true },
    reference: { type: String, unique: true },
    // NEW DETAILED STATUSES
    status: {
        type: String,
        enum: ['Pending', 'Awaiting Approval', 'Processing', 'Order Shipped', 'Delivered', 'Rejected', 'Cancelled'],
        default: 'Pending'
    },
    paymentStatus: {
        type: String,
        enum: ['Unpaid', 'Paid'],
        default: 'Unpaid'
    }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);