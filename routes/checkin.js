const express = require('express');
const router = express.Router();
const checkInController = require('../controllers/checkInController');
const { ensureAuthenticated } = require('../middleware/auth');

router.post('/', 
    ensureAuthenticated, 
    checkInController.uploadProofImage, 
    checkInController.createCheckIn
);

router.patch('/location/:id',
    ensureAuthenticated,
    checkInController.updateLocation
);

module.exports = router;