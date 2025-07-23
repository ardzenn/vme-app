const mongoose_DirectMessage = require('mongoose');
const { Schema: Schema_DirectMessage } = mongoose_DirectMessage;

const directMessageSchema = new Schema_DirectMessage({
  sender: { type: Schema_DirectMessage.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: Schema_DirectMessage.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true }
}, {
  timestamps: true
});

module.exports = mongoose_DirectMessage.models.DirectMessage || mongoose_DirectMessage.model('DirectMessage', directMessageSchema);
