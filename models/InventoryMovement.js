const mongoose = require('mongoose');
const { Schema } = mongoose;

const inventoryMovementSchema = new Schema({
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    stockItem: { type: Schema.Types.ObjectId, ref: 'StockItem', required: true },
    type: {
        type: String,
        required: true,
        enum: ['Stock In', 'Stock Out', 'Adjustment', 'Transfer']
    },
    quantity: { type: Number, required: true }, // The amount that changed (+ for in, - for out)
    user: { type: Schema.Types.ObjectId, ref: 'User' }, // Who performed the action
    relatedOrder: { type: Schema.Types.ObjectId, ref: 'Order' }, // Link to sales order if 'Stock Out'
    notes: { type: String, trim: true }
}, { timestamps: true });

module.exports = mongoose.model('InventoryMovement', inventoryMovementSchema);