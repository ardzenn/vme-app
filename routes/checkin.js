const express_checkin = require('express');
const router_checkin = express_checkin.Router();
const checkInController_checkin = require('../controllers/checkInController');
const { ensureAuthenticated: ensureAuthenticated_checkin } = require('../middleware/auth');

// This route now uses three middleware functions in order:
// 1. ensureAuthenticated: to make sure the user is logged in
// 2. checkInController.uploadProof: to process the file upload from the form
// 3. checkInController.createCheckIn: the main controller logic that saves the data.
router_checkin.post('/', ensureAuthenticated_checkin, checkInController_checkin.uploadProof, checkInController_checkin.createCheckIn);

module.exports = router_checkin;
