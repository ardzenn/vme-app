const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { ensureAuthenticated, ensureAdmin } = require('../middleware/auth');

// POST route for sending a company-wide announcement
router.post('/announce', ensureAuthenticated, ensureAdmin, adminController.sendAnnouncement);

module.exports = router;