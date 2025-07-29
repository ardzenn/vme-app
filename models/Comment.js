const mongoose = require('mongoose');
const { Schema } = mongoose;

const notificationSchema = new Schema({
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User' },
    type: {
        type: String,
        required: true,
        enum: [
            'NEW_CHECKIN', 'NEW_ORDER', 'NEW_PLAN', 'NEW_REPORT', 
            'NEW_COLLECTION', 'NEW_DEPOSIT', 'NEW_STOCK', 
            'NEW_COMMENT', 'NEW_CHAT_MESSAGE', 'ANNOUNCEMENT', 'ORDER_UPDATE'
        ]
    },
    message: { type: String, required: true },
    link: { type: String, required: true },
    isRead: { type: Boolean, default: false }
}, { timestamps: true });

notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);