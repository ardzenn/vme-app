const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');
const orderController = require('../controllers/orderController');
const chatController = require('../controllers/chatController');
const { ensureAuthenticated } = require('../middleware/auth');

// --- Non-Chat API Routes ---
router.post('/location', ensureAuthenticated, apiController.updateLocation);
router.get('/orders/:id', ensureAuthenticated, orderController.getOrderDetailsAndMessages);
router.post('/hospitals/add', ensureAuthenticated, apiController.addHospital);
router.post('/doctors/add', ensureAuthenticated, apiController.addDoctor);
router.delete('/hospitals/:id', ensureAuthenticated, apiController.deleteHospital);
router.delete('/doctors/:id', ensureAuthenticated, apiController.deleteDoctor);

// --- CHAT API ROUTES ---
router.get('/users', ensureAuthenticated, chatController.getAllUsers);
router.get('/conversations', ensureAuthenticated, chatController.getConversations);
router.get('/conversations/:conversationId/messages', ensureAuthenticated, chatController.getMessagesByConversation);
router.post('/conversations/:conversationId/messages', ensureAuthenticated, chatController.addMessageToConversation);
router.patch('/conversations/:conversationId/hide', ensureAuthenticated, chatController.hideConversation);
router.post('/conversations/findOrCreate', ensureAuthenticated, chatController.findOrCreateConversation);
router.post('/conversations/group', ensureAuthenticated, chatController.createGroupConversation);
router.delete('/conversations/:conversationId', ensureAuthenticated, chatController.deleteGroup);
router.delete('/conversations/:conversationId/participants/:participantId', ensureAuthenticated, chatController.removeParticipant);

module.exports = router;