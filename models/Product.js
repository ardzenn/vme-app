const mongoose = require('mongoose');


const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    unit: { type: String, required: true },
    imageUrl: { type: String },
    isActive: { type: Boolean, default: true },
    
    stock: { type: Number, default: 0 },
    minStock: { type: Number, default: 1 }, // Minimum stock threshold
    maxStock: { type: Number, default: 100000 }, // Maximum stock threshold
    stockHistory: [{
        type: { type: String, enum: ['received', 'sold', 'adjustment_increase', 'adjustment_decrease', 'returned'] },
        quantity: Number,
        previousStock: Number,
        newStock: Number,
        reason: String,
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        date: { type: Date, default: Date.now },
        batchNumber: String,
        expirationDate: Date
    }],
    lastRestockDate: Date,
    supplier: String,
    reorderPoint: { type: Number, default: 20 }
}, { timestamps: true });

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);