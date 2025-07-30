const express = require('express');
const router = express.Router();
const dailyReportController = require('../controllers/dailyReportController');
const { ensureAuthenticated } = require('../middleware/auth');

router.get('/', ensureAuthenticated, dailyReportController.getReportForm);
// FIXED: Changed 'uploadAttachments' to the correct 'uploadReportAttachments'
router.post('/', ensureAuthenticated, dailyReportController.uploadReportAttachments, dailyReportController.submitReport);
router.get('/history', ensureAuthenticated, dailyReportController.listReports);
router.get('/check-ins', ensureAuthenticated, dailyReportController.getDailyCheckInReport);
router.get('/:id', ensureAuthenticated, dailyReportController.getReportDetails);
router.get('/check-ins/export', ensureAuthenticated, dailyReportController.exportDailyCheckInReport);

module.exports = router;