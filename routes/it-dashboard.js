const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureHasRole } = require('../middleware/auth');
const viewController = require('../controllers/viewController');

// IT dashboard (GET)
router.get('/', ensureAuthenticated, ensureHasRole(['IT']), viewController.getITDashboard);

module.exports = router;
