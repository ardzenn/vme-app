const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { ensureAuthenticated } = require('../middleware/auth');

// This file's only job is to render the full-screen chat page at the "/chat" URL.
router.get('/', ensureAuthenticated, chatController.getChatPage);

module.exports = router;