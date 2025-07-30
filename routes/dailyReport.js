const express = require('express');
const router = express.Router();
const dailyReportController = require('../controllers/dailyReportController');
const { ensureAuthenticated } = require('../middleware/auth');

// Show the daily report form
router.get('/', ensureAuthenticated, dailyReportController.getReportForm);

// Handle daily report submission with file uploads
router.post(
    '/',
    ensureAuthenticated,
    dailyReportController.uploadReportAttachments,
    dailyReportController.submitReport
);

// List report history
router.get('/history', ensureAuthenticated, dailyReportController.listReports);

// Show check-ins of the day
router.get('/check-ins', ensureAuthenticated, dailyReportController.getDailyCheckInReport);

// Export check-in report as CSV
router.get('/check-ins/export', ensureAuthenticated, dailyReportController.exportDailyCheckInReport);

// Show specific report details
router.get('/:id', ensureAuthenticated, dailyReportController.getReportDetails);

module.exports = router;
