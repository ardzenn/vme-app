const mongoose = require('mongoose');
const { Schema } = mongoose;

const postSchema = new Schema({
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, trim: true, required: true },
    // MODIFIED: Replaced imageUrl with a more flexible media structure
    mediaUrl: { type: String },
    mediaType: { type: String, enum: ['image', 'video'] },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    comments: [{ type: Schema.Types.ObjectId, ref: 'Comment' }]
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);