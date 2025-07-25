const express = require('express');
const router = express.Router();
const dailyReportController = require('../controllers/dailyReportController');
const { ensureAuthenticated } = require('../middleware/auth');

// GET route to display the report form
router.get('/', ensureAuthenticated, dailyReportController.getReportForm);

// POST route to submit the new report
router.post('/', 
    ensureAuthenticated, 
    dailyReportController.uploadAttachments, 
    dailyReportController.submitReport
);

// GET route to view the history of all reports (for Admins/Accounting)
router.get('/history', ensureAuthenticated, dailyReportController.listReports);

// GET route to view a single report's details
router.get('/:id', ensureAuthenticated, dailyReportController.getReportDetails);

module.exports = router;