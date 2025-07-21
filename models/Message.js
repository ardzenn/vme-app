const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  attachment: { type: String }
}, { timestamps: true }); // <-- ADD THIS OBJECT

module.exports = mongoose.model('Message', messageSchema);