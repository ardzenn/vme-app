const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');
const orderController = require('../controllers/orderController');
const chatController = require('../controllers/chatController');
const { ensureAuthenticated } = require('../middleware/auth');

// --- Location API Routes ---
router.post('/location', ensureAuthenticated, apiController.updateLocation);
router.get('/location-log/history', ensureAuthenticated, apiController.getUserLocationHistory);
router.get('/location/history', apiController.getUserLocationHistory);
router.get('/users-with-locations', ensureAuthenticated, apiController.getUsersWithLocations);


// --- Order API Route ---
router.get('/orders/:id', ensureAuthenticated, orderController.getOrderDetailsAndMessages);

// --- Client Masterlist API Routes ---
router.post('/hospitals/add', ensureAuthenticated, apiController.addHospital);
router.post('/doctors/add', ensureAuthenticated, apiController.addDoctor);
router.delete('/hospitals/:id', ensureAuthenticated, apiController.deleteHospital);
router.delete('/doctors/:id', ensureAuthenticated, apiController.deleteDoctor);
router.post('/clients/import', ensureAuthenticated, apiController.uploadCsv, apiController.importClients);

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
