const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

exports.getMessageHistory = async (req, res) => {
    try {
        // This logic is based on the new Conversation model
        const recipientId = req.params.userId;
        const senderId = req.user.id;

        const conversation = await Conversation.findOne({
            isGroup: false,
            participants: { $all: [senderId, recipientId], $size: 2 }
        });

        if (!conversation) {
            return res.json([]); // No conversation yet, return empty history
        }

        const messages = await Message.find({ conversation: conversation._id })
            .sort({ createdAt: 'asc' })
            .populate('sender', 'firstName lastName profilePicture');

        res.json(messages);
    } catch (err) {
        console.error("Error fetching message history:", err);
        res.status(500).json({ message: 'Failed to load messages.' });
    }
};
