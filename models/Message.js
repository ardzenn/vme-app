const mongoose = require('mongoose');
const { Schema } = mongoose;

const messageSchema = new Schema({
  order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Text is now optional, as a message might only contain an attachment
  text: { type: String }, 
  
  // --- NEW FIELD ---
  // This will store the path to the uploaded file (e.g., /uploads/chat/file.jpg)
  attachment: { type: String }, 

}, { timestamps: true });

module.exports = mongoose.models.Message || mongoose.model('Message', messageSchema);
