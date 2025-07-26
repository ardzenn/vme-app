const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { ensureAuthenticated } = require('../middleware/auth');

router.get('/api', ensureAuthenticated, notificationController.getNotificationsApi);
router.post('/api/read', ensureAuthenticated, notificationController.markAsRead);

module.exports = router;