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

// View report (alias for getReportDetails)
router.get('/view/:id', ensureAuthenticated, dailyReportController.getReportDetails);

// Edit report form
router.get('/edit/:id', ensureAuthenticated, dailyReportController.getReportEditForm);

// Update report
router.put('/:id', ensureAuthenticated, dailyReportController.uploadReportAttachments, dailyReportController.updateReport);

// POST route for update (fallback for forms that don't support PUT)
router.post('/:id', ensureAuthenticated, dailyReportController.uploadReportAttachments, dailyReportController.updateReport);

module.exports = router;
