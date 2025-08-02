const mongoose = require('mongoose');
const { Schema } = mongoose;

// Define the attachment sub-schema
const attachmentSchema = new Schema({
    url: { type: String, required: true },
    type: { 
        type: String, 
        enum: ['image', 'video', 'audio', 'pdf', 'doc', 'sheet', 'slide', 'file'],
        default: 'file'
    },
    name: { type: String, default: 'file' },
    size: { type: Number },
    mimeType: { type: String }
}, { _id: false });

const messageSchema = new Schema({
    sender: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    text: { 
        type: String,
        trim: true
    },
    messageType: {
        type: String,
        enum: ['text', 'image', 'video', 'audio', 'file', 'gif'],
        default: 'text'
    },
    attachments: [attachmentSchema],
    conversation: { 
        type: Schema.Types.ObjectId, 
        ref: 'Conversation',
        required: true
    },
    order: { 
        type: Schema.Types.ObjectId, 
        ref: 'Order' 
    },
    readBy: [{ 
        type: Schema.Types.ObjectId, 
        ref: 'User' 
    }],
    status: {
        type: String,
        enum: ['sending', 'sent', 'delivered', 'read', 'failed'],
        default: 'sent'
    },
    tempMessageId: {
        type: String,
        index: true,
        sparse: true
    }
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

module.exports = mongoose.models.Message || mongoose.model('Message', messageSchema);