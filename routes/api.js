const express = require('express');
const apiController = require('../controllers/apiController');
const orderController = require('../controllers/orderController');
const chatController = require('../controllers/chatController');
const { ensureAuthenticated } = require('../middleware/auth');

const router = express.Router();

// API endpoint for updating user location via fetch/axios
router.post('/location', ensureAuthenticated, apiController.updateLocation);

// API endpoint to get details for the order modal, including messages
router.get('/orders/:id', ensureAuthenticated, orderController.getOrderDetailsAndMessages);

// API endpoint to get message history for a direct message chat
router.get('/messages/:userId', ensureAuthenticated, chatController.getMessageHistory);


module.exports = router;
