const mongoose = require('mongoose');
const { Schema } = mongoose;

const postSchema = new Schema({
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, trim: true, required: true },
    mediaUrl: { type: String },
    mediaPublicId: { type: String },
    mediaType: { type: String, enum: ['image', 'video'] },
    reactions: [{
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        type: { type: String, required: true, enum: ['like', 'heart', 'laugh', 'wow', 'sad'] }
    }],
    comments: [{ type: Schema.Types.ObjectId, ref: 'Comment' }]
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);