const express = require('express');
const { authMiddleware } = require('./auth');
const User = require('../models/User');
const DirectMessage = require('../models/DirectMessage'); // We need this new model

const router = express.Router();

// Protect all chat routes
router.use(authMiddleware);

// Route to render the main chat page
router.get('/', async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.id } }).select('username profilePicture');
    res.render('chat', { 
      user: req.user,
      conversations: users 
    });
  } catch (error) {
    console.error("Error fetching users for chat:", error);
    res.status(500).send("Error loading chat page.");
  }
});

// ** UPDATED **
// API route to get message history with a specific user
router.get('/messages/:recipientId', async (req, res) => {
  try {
    const { recipientId } = req.params;
    const currentUserId = req.user.id;

    // Find messages between the current user and the recipient
    const messages = await DirectMessage.find({
      $or: [
        { sender: currentUserId, recipient: recipientId },
        { sender: recipientId, recipient: currentUserId }
      ]
    }).sort({ createdAt: 'asc' }).populate('sender', 'username profilePicture');

    res.json(messages);

  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Error fetching message history." });
  }
});

module.exports = router;