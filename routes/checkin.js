const express = require('express');
const router = express.Router();
const checkInController = require('../controllers/checkInController');
const { ensureAuthenticated } = require('../middleware/auth');

// This is the ONLY route this file should have.
// It handles the submission of the check-in form from the modal.
router.post('/', 
    ensureAuthenticated, 
    checkInController.uploadCheckInImages, 
    checkInController.createCheckIn
);

module.exports = router;
