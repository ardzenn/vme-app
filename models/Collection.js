const mongoose_Collection = require('mongoose');
const { Schema: Schema_Collection } = mongoose_Collection;

const collectionSchema = new Schema_Collection({
  user: { type: Schema_Collection.Types.ObjectId, ref: 'User', required: true },
  file: { type: String, required: true },
  type: { type: String, enum: ['Invoice', 'Bill', 'Other'], required: true }
}, { timestamps: true });

module.exports = mongoose_Collection.models.Collection || mongoose_Collection.model('Collection', collectionSchema);