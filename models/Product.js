// in models/Product.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const productSchema = new Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: { 
        type: String, 
        enum: ['Service Products', 'Exclusive Meds', 'Other'], 
        required: true 
    },
    imageUrl: { type: String, required: true } // Path to the uploaded product image
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);