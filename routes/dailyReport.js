// in routes/dailyReport.js
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/dailyReportController');
const { ensureAuthenticated, ensureAdmin, ensureAccounting } = require('../middleware/auth');

// MSR/KAS: View the form to create a report
router.get('/', ensureAuthenticated, reportController.getReportForm);

// MSR/KAS: Submit the form
router.post('/', ensureAuthenticated, reportController.uploadAttachments, reportController.submitReport);

// Admin/Accounting: View list of all submitted reports
router.get('/history', ensureAuthenticated, (req, res, next) => {
    if (req.user.role === 'Admin' || req.user.role === 'Accounting') {
        return next();
    }
    req.flash('error_msg', 'Access denied.');
    res.redirect('/dashboard');
}, reportController.listReports);

// Admin/Accounting: View one specific report
router.get('/:id', ensureAuthenticated, (req, res, next) => {
    if (req.user.role === 'Admin' || req.user.role === 'Accounting') {
        return next();
    }
    req.flash('error_msg', 'Access denied.');
    res.redirect('/dashboard');
}, reportController.getReportDetails);

module.exports = router;