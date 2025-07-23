// in routes/push.js
const express = require('express');
const router = express.Router();
const pushController = require('../controllers/pushController');
const { ensureAuthenticated } = require('../middleware/auth');

router.post('/subscribe', ensureAuthenticated, pushController.subscribe);

module.exports = router;