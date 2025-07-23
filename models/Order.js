const mongoose = require('mongoose');
const { Schema } = mongoose;

const orderSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
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
    salesInvoice: { type: String },
    
    // --- NEW FIELD ---
    // This will store the path to the uploaded image file
    attachment: { type: String }, 

    status: {
        type: String,
        enum: ['Pending', 'Awaiting Approval', 'Processing', 'Order Shipped', 'Delivered', 'Rejected', 'Cancelled'],
        default: 'Pending'
    },
    paymentStatus: {
        type: String,
        enum: ['Unpaid', 'Paid'],
        default: 'Unpaid'
    },
    messages: [{
        type: Schema.Types.ObjectId,
        ref: 'Message'
    }]
}, { timestamps: true });

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);
