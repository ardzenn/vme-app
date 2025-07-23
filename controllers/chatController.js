const User = require('../models/User');
const DirectMessage = require('../models/DirectMessage');

/**
 * API endpoint to get the message history between the logged-in user and another user.
 */
exports.getMessageHistory = async (req, res) => {
    try {
        const recipientId = req.params.userId;
        const senderId = req.user.id;

        const messages = await DirectMessage.find({
            $or: [
                { sender: senderId, recipient: recipientId },
                { sender: recipientId, recipient: senderId }
            ]
        })
        .sort({ createdAt: 'asc' })
        .populate('sender', 'firstName lastName profilePicture');

        res.json(messages);

    } catch (err) {
        console.error("Error fetching message history:", err);
        res.status(500).json({ message: 'Failed to load messages.' });
    }
};
