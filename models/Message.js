const mongoose = require('mongoose');
const { Schema } = mongoose;

const messageSchema = new Schema({
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    attachment: { type: String },

    // A message can belong to EITHER a general conversation OR a specific order
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation' },
    order: { type: Schema.Types.ObjectId, ref: 'Order' },

    // Legacy support for the old 'user' field
    user: { type: Schema.Types.ObjectId, ref: 'User' },

    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

// This ensures 'sender' is always populated from 'user' if 'sender' is missing
messageSchema.pre('validate', function(next) {
    if (this.user && !this.sender) {
        this.sender = this.user;
    }
    next();
});

module.exports = mongoose.models.Message || mongoose.model('Message', messageSchema);