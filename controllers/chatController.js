const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

// Renders the main full-screen chat page
exports.getChatPage = async (req, res) => {
    try {
        // This logic is similar to what's needed for the chat widget
        const conversations = await Conversation.find({ participants: req.user.id })
            .populate('participants', 'firstName lastName profilePicture')
            .populate({
                path: 'lastMessage',
                populate: { path: 'sender', select: 'firstName' }
            })
            .sort({ updatedAt: -1 });
            
        res.render('chat', { conversations });
    } catch (err) {
        console.error("Chat Page Error:", err);
        req.flash('error_msg', 'Could not load chat page.');
        res.redirect('/dashboard');
    }
};

// Gets message history for a specific conversation (for the pop-up widget)
exports.getMessageHistory = async (req, res) => {
    try {
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