const mongoose = require('mongoose');
const { Schema } = mongoose;

const messageSchema = new Schema({
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String },
    attachment: { type: String },
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation' },
    order: { type: Schema.Types.ObjectId, ref: 'Order' },
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.models.Message || mongoose.model('Message', messageSchema);