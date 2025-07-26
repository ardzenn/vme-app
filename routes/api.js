const express = require('express');
const apiController = require('../controllers/apiController');
const orderController = require('../controllers/orderController');
const chatController = require('../controllers/chatController');
const { ensureAuthenticated } = require('../middleware/auth');
const conversationController = require('../controllers/conversationController');

const router = express.Router();

// API endpoint for updating user location via fetch/axios
router.post('/location', ensureAuthenticated, apiController.updateLocation);

// API endpoint to get details for the order modal, including messages
router.get('/orders/:id', ensureAuthenticated, orderController.getOrderDetailsAndMessages);

// API endpoint to get message history for a direct message chat
router.get('/messages/:userId', ensureAuthenticated, chatController.getMessageHistory);

// VME CHAT ROUTES
router.get('/conversations', ensureAuthenticated, conversationController.getConversations);
router.get('/conversations/:convoId/messages', ensureAuthenticated, conversationController.getMessagesForConversation);
router.post('/conversations/findOrCreate', ensureAuthenticated, conversationController.findOrCreateConversation);
router.post('/conversations/group', ensureAuthenticated, conversationController.createGroup);
router.delete('/conversations/:convoId/participants/:userId', ensureAuthenticated, conversationController.removeParticipant);
router.delete('/conversations/:convoId', ensureAuthenticated, conversationController.deleteGroup);


// routes
router.post('/hospitals/add', ensureAuthenticated, apiController.addHospital);
router.post('/doctors/add', ensureAuthenticated, apiController.addDoctor);
router.delete('/hospitals/:id', ensureAuthenticated, apiController.deleteHospital);
router.delete('/doctors/:id', ensureAuthenticated, apiController.deleteDoctor);
router.delete('/hospitals/:id', ensureAuthenticated, apiController.deleteHospital);
router.delete('/doctors/:id', ensureAuthenticated, apiController.deleteDoctor);


module.exports = router;
