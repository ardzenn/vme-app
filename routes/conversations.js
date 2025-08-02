const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const chatUploadController = require('../controllers/chatUploadController');
const { ensureAuthenticated } = require('../middleware/auth');

// GET all conversations for the logged-in user
router.get('/', ensureAuthenticated, chatController.getConversations);

// POST to create a new support chat with IT
router.post('/support', ensureAuthenticated, chatController.createSupportChat);

// POST to find or create a one-on-one chat
router.post('/findOrCreate', ensureAuthenticated, chatController.findOrCreateConversation);

// POST to create a new group chat
router.post('/group', ensureAuthenticated, chatController.createGroupConversation);

// GET all messages for a specific conversation
router.get('/:conversationId/messages', ensureAuthenticated, chatController.getMessagesByConversation);

// POST a new message to a conversation
router.post('/:conversationId/messages', ensureAuthenticated, chatController.addMessageToConversation);

// PATCH to hide a conversation for the current user
router.patch('/:conversationId/hide', ensureAuthenticated, chatController.hideConversation);

// DELETE a group (only by admin)
router.delete('/:conversationId', ensureAuthenticated, chatController.deleteGroup);

// DELETE a participant from a group (only by admin)
router.delete('/:conversationId/participants/:userId', ensureAuthenticated, chatController.removeParticipant);

// File upload endpoints for chat
router.post(
  '/:conversationId/upload', 
  ensureAuthenticated, 
  chatUploadController.chatUploadMiddleware, 
  chatUploadController.uploadChatFile
);

// Multiple file upload endpoint for chat
router.post(
  '/:conversationId/upload-multiple', 
  ensureAuthenticated, 
  (req, res, next) => chatUploadController.uploadMultipleChatFiles(req, res, next),
  chatUploadController.handleMultipleFileUpload
);

module.exports = router;