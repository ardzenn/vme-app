const express = require('express');
const router = express.Router();
const checkInController = require('../controllers/checkInController');
const { ensureAuthenticated } = require('../middleware/auth');

// This route now creates the check-in WITHOUT location and returns JSON
router.post('/', 
    ensureAuthenticated, 
    checkInController.uploadProofImage, 
    checkInController.createCheckIn
);

// ADDED: New route to update a check-in with location data later
router.patch('/location/:id',
    ensureAuthenticated,
    checkInController.updateLocation
);

module.exports = router;