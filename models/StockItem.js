const mongoose = require('mongoose');
const { Schema } = mongoose;

const stockItemSchema = new Schema({
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    batchNumber: { type: String, required: true, trim: true },
    expirationDate: { type: Date, required: true },
    quantityOnHand: { type: Number, required: true, default: 0, min: 0 },
    location: { type: String, required: true, default: 'Main Warehouse', trim: true }, 
}, { timestamps: true });

// Ensures you don't have duplicate batches of the same product in the same location
stockItemSchema.index({ product: 1, batchNumber: 1, location: 1 }, { unique: true });

module.exports = mongoose.model('StockItem', stockItemSchema);