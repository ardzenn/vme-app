const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { ensureAuthenticated } = require('../middleware/auth');

// GET route to display the main chat page
router.get('/', ensureAuthenticated, chatController.getChatPage);

// API route to get message history for a 1-on-1 chat
// (Used by the pop-up chat widget)
router.get('/history/:userId', ensureAuthenticated, chatController.getMessageHistory);

module.exports = router;