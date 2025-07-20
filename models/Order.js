const mongoose = require('mongoose');

module.exports = mongoose.model('Order', new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customerName: { type: String, required: true },
  area: { type: String, required: true },
  hospital: { type: String, required: true },
  contactNumber: { type: String, required: true },
  email: { type: String, required: true },
  note: { type: String },
  products: [{ 
    product: String, 
    quantity: Number, 
    price: Number, 
    total: Number 
  }],
  subtotal: Number,
  attachment: { type: String },
  status: { type: String, default: 'Pending' },
  reference: String,
  salesInvoice: { type: String },
  salesOrderNumber: { type: String },
  timestamp: { type: Date, default: Date.now }
}));