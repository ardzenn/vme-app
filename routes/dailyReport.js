const express = require('express');
const router = express.Router();
const dailyReportController = require('../controllers/dailyReportController');
const { ensureAuthenticated } = require('../middleware/auth');

router.get('/', ensureAuthenticated, dailyReportController.getReportForm);
router.post('/', ensureAuthenticated, dailyReportController.uploadAttachments, dailyReportController.submitReport);
router.get('/history', ensureAuthenticated, dailyReportController.listReports);
router.get('/check-ins', ensureAuthenticated, dailyReportController.getDailyCheckInReport);
router.get('/:id', ensureAuthenticated, dailyReportController.getReportDetails);

// --- EXPORT ROUTE ---
// ADDED: New route for exporting daily check-in data
router.get('/check-ins/export', ensureAuthenticated, dailyReportController.exportDailyCheckInReport);

module.exports = router;
