const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');


/**
 * GET /api/conversations
 * Fetches all conversations (1-on-1 and group) for the logged-in user.
 */
exports.getConversations = async (req, res) => {
    try {
        const conversations = await Conversation.find({ participants: req.user.id })
            .populate('participants', 'firstName lastName profilePicture')
            .populate({
                path: 'lastMessage',
                populate: { path: 'sender', select: 'firstName' }
            })
            .sort({ updatedAt: -1 });
        res.json(conversations);
    } catch (err) {
        res.status(500).json({ message: 'Failed to get conversations.' });
    }
};
/**
 * GET /api/conversations/:convoId/messages
 * Fetches all messages for a specific conversation.
 */
exports.getMessagesForConversation = async (req, res) => {
    try {
        const messages = await Message.find({ conversation: req.params.convoId })
            .populate('sender', 'firstName lastName profilePicture')
            .sort({ createdAt: 'asc' });
        res.json(messages);
    } catch (err) {
        res.status(500).json({ message: 'Failed to load messages.' });
    }
};

/**
 * POST /api/conversations/findOrCreate
 * Finds an existing 1-on-1 conversation or creates a new one.
 */
exports.findOrCreateConversation = async (req, res) => {
    try {
        const senderId = req.user.id;
        const { recipientId } = req.body;

        if (!recipientId) {
            return res.status(400).json({ message: 'Recipient ID is required.' });
        }

        let conversation = await Conversation.findOne({
            isGroup: false,
            participants: { $all: [senderId, recipientId], $size: 2 }
        }).populate('participants', 'firstName lastName profilePicture');

        if (!conversation) {
            conversation = new Conversation({
                participants: [senderId, recipientId]
            });
            await conversation.save();
            conversation = await Conversation.findById(conversation._id).populate('participants', 'firstName lastName profilePicture');
        }
        res.status(200).json(conversation);
    } catch (err) {
        console.error("findOrCreateConversation Error:", err);
        res.status(500).json({ message: 'Failed to start conversation.' });
    }
};

/**
 * POST /api/conversations/group
 * Creates a new group chat.
 */
exports.createGroup = async (req, res) => {
    try {
        let { groupName, participants } = req.body;
        
        if (!participants || participants.length === 0) {
            return res.status(400).json({ message: 'Please select at least one participant.'});
        }
        
        participants.push(req.user.id);

        const newGroup = new Conversation({
            participants,
            groupName,
            isGroup: true,
            groupAdmin: req.user.id // Assign the creator as admin
        });
        await newGroup.save();
        const populatedGroup = await Conversation.findById(newGroup._id).populate('participants', 'firstName lastName profilePicture');
        res.status(201).json(populatedGroup);
    } catch (err) {
        console.error("Create Group Error:", err);
        res.status(500).json({ message: 'Failed to create group.' });
    }
};

exports.removeParticipant = async (req, res) => {
    try {
        const { convoId, userId } = req.params;
        const conversation = await Conversation.findById(convoId);

        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found.' });
        }
        // Security check: Only the admin can remove users
        if (conversation.groupAdmin.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Only the group admin can remove participants.' });
        }

        await Conversation.findByIdAndUpdate(convoId, {
            $pull: { participants: userId }
        });
        res.status(200).json({ success: true, message: 'User removed.' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to remove user.' });
    }
};

exports.deleteGroup = async (req, res) => {
    try {
        const { convoId } = req.params;
        const conversation = await Conversation.findById(convoId);

        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found.' });
        }
        // Security check: Only the admin can delete the group
        if (conversation.groupAdmin.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Only the group admin can delete the group.' });
        }

        // Delete all messages in the conversation, then delete the conversation itself
        await Message.deleteMany({ conversation: convoId });
        await Conversation.findByIdAndDelete(convoId);

        res.status(200).json({ success: true, message: 'Group deleted.' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete group.' });
    }
};