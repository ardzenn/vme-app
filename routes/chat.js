const express = require('express');
const viewController = require('../controllers/viewController');
const { ensureAuthenticated } = require('../middleware/auth');

const router = express.Router();

// This route is responsible for rendering the main chat page.
// The real-time messaging will then be handled by Socket.IO on the client-side.
router.get('/', ensureAuthenticated, viewController.getChatPage);

module.exports = router;
