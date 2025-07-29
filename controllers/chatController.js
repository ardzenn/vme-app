const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const { createNotificationsForGroup } = require('../services/notificationService');

exports.getChatPage = async (req, res) => {
    try {
        res.render('chat', { currentUser: req.user });
    } catch (err) {
        console.error("Chat Page Error:", err);
        req.flash('error_msg', 'Could not load chat page.');
        res.redirect('/dashboard');
    }
};

exports.createSupportChat = async (req, res) => {
    try {
        const requestingUser = req.user;
        const itUsers = await User.find({ role: 'IT' }).select('_id');
        if (itUsers.length === 0) {
            return res.status(404).json({ success: false, message: 'No IT support staff are currently available.' });
        }
        const itUserIds = itUsers.map(user => user._id);
        const participants = [requestingUser._id, ...itUserIds];
        const newConversation = new Conversation({
            participants,
            isGroup: true,
            groupName: `Support: ${requestingUser.firstName} ${requestingUser.lastName}`,
            groupAdmin: requestingUser._id
        });
        await newConversation.save();
        const populatedConvo = await Conversation.findById(newConversation._id).populate('participants', 'firstName lastName profilePicture');
        const io = req.app.get('io');
        itUserIds.forEach(id => {
            io.to(id.toString()).emit('newConversation', populatedConvo);
        });
        res.status(201).json({ success: true, conversation: populatedConvo });
    } catch (error) {
        console.error("Error creating support chat:", error);
        res.status(500).json({ success: false, message: 'Could not create support chat.' });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({ _id: { $ne: req.user.id } }).select('firstName lastName profilePicture');
        res.json(users);
    } catch (err) {
        console.error("Error fetching users:", err);
        res.status(500).json({ message: 'Failed to load users.' });
    }
};

exports.getConversations = async (req, res) => {
    try {
        const conversations = await Conversation.find({ 
                participants: req.user.id,
                hiddenBy: { $ne: req.user.id } 
            })
            .populate('participants', 'firstName lastName profilePicture')
            .populate({
                path: 'lastMessage',
                populate: { path: 'sender', select: 'firstName text' }
            })
            .sort({ updatedAt: -1 });
        res.json(conversations);
    } catch (err) {
        console.error("Error fetching conversations:", err);
        res.status(500).json({ message: 'Failed to load conversations.' });
    }
};

exports.getMessagesByConversation = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const conversation = await Conversation.findOne({ _id: conversationId, participants: req.user.id });
        if (!conversation) {
            return res.status(403).json({ message: 'Forbidden: You are not a member of this conversation.' });
        }
        const messages = await Message.find({ conversation: conversationId })
            .sort({ createdAt: 'asc' })
            .populate('sender', 'firstName lastName profilePicture');
        res.json(messages);
    } catch (err) {
        console.error("Error fetching messages:", err);
        res.status(500).json({ message: 'Failed to load messages.' });
    }
};

exports.addMessageToConversation = async (req, res) => {
    try {
        const { text } = req.body;
        const { conversationId } = req.params;
        const sender = req.user;

        if (!text || text.trim() === '') {
             return res.status(400).json({ success: false, message: 'Message text cannot be empty.' });
        }

        const message = new Message({
            conversation: conversationId,
            sender: sender._id,
            text: text
        });
        await message.save();

        await Conversation.findByIdAndUpdate(conversationId, { 
            lastMessage: message._id
        });

        const populatedMessage = await Message.findById(message._id)
            .populate('sender', 'firstName lastName profilePicture');

        const io = req.app.get('io');
        io.to(conversationId).emit('newMessage', populatedMessage);

        const conversation = await Conversation.findById(conversationId);
        const recipientIds = conversation.participants.filter(pId => pId.toString() !== sender._id.toString());
        const notificationText = `You have a new message from ${sender.firstName} in "${conversation.groupName || 'your chat'}".`;
        const notificationLink = `/chat?convoId=${conversationId}`;
        await createNotificationsForGroup(io, recipientIds, notificationText, notificationLink);

        res.status(201).json({ success: true, message: populatedMessage });
    } catch (err) {
        console.error("Add chat message error:", err);
        res.status(500).json({ success: false, message: 'Failed to send message.' });
    }
};

exports.findOrCreateConversation = async (req, res) => {
    try {
        const { recipientId } = req.body;
        const senderId = req.user.id;
        if (!recipientId) {
            return res.status(400).json({ message: 'Recipient ID is required.'});
        }
        let conversation = await Conversation.findOne({
            isGroup: false,
            participants: { $all: [senderId, recipientId], $size: 2 }
        });
        if (!conversation) {
            conversation = new Conversation({
                participants: [senderId, recipientId]
            });
            await conversation.save();
        }
        const populatedConvo = await Conversation.findById(conversation._id)
            .populate('participants', 'firstName lastName profilePicture');
        res.json(populatedConvo);
    } catch (err) {
        console.error("Error finding/creating conversation:", err);
        res.status(500).json({ message: 'Failed to start chat.' });
    }
};

exports.createGroupConversation = async (req, res) => {
    try {
        const { groupName, participants } = req.body;
        const adminId = req.user.id;
        if (!groupName || !participants || participants.length === 0) {
            return res.status(400).json({ message: 'Group name and participants are required.' });
        }
        const allParticipants = [...new Set([adminId, ...participants])];
        let conversation = await Conversation.create({
            groupName,
            participants: allParticipants,
            isGroup: true,
            groupAdmin: adminId,
        });
        conversation = await conversation.populate('participants', 'firstName lastName profilePicture');
        res.status(201).json(conversation);
    } catch (err) {
        console.error("Error creating group:", err);
        res.status(500).json({ message: 'Failed to create group.' });
    }
};

exports.hideConversation = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;
        await Conversation.updateOne({ _id: conversationId, participants: userId }, { $addToSet: { hiddenBy: userId } });
        res.status(200).json({ message: 'Conversation hidden successfully.' });
    } catch (err) {
        console.error("Error hiding conversation:", err);
        res.status(500).json({ message: 'Failed to hide conversation.' });
    }
};

exports.deleteGroup = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const group = await Conversation.findOne({ _id: conversationId, groupAdmin: req.user.id });
        if (!group) {
            return res.status(403).json({ message: "Forbidden: Only the group admin can delete the group." });
        }
        await Conversation.deleteOne({ _id: conversationId });
        await Message.deleteMany({ conversation: conversationId });
        res.status(200).json({ message: 'Group deleted successfully.' });
    } catch (err) {
        console.error("Error deleting group:", err);
        res.status(500).json({ message: 'Failed to delete group.' });
    }
};

exports.removeParticipant = async (req, res) => {
    try {
        const { conversationId, participantId } = req.params;
        const group = await Conversation.findOne({ _id: conversationId, groupAdmin: req.user.id });
        if (!group) {
            return res.status(403).json({ message: "Forbidden: Only the group admin can remove participants." });
        }
        if (group.groupAdmin.toString() === participantId) {
            return res.status(400).json({ message: "Admin cannot be removed from the group." });
        }
        await Conversation.updateOne({ _id: conversationId }, { $pull: { participants: participantId } });
        res.status(200).json({ message: "Participant removed." });
    } catch (err) {
        console.error("Error removing participant:", err);
        res.status(500).json({ message: 'Failed to remove participant.' });
    }
};