const mongoose = require('mongoose');
const { Schema } = mongoose;

const commentSchema = new Schema({
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    post: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    content: { type: String, required: true, trim: true }
}, { timestamps: true });

module.exports = mongoose.model('Comment', commentSchema);