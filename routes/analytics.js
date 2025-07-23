// in routes/analytics.js
const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { ensureAuthenticated, ensureAdmin, ensureAccounting } = require('../middleware/auth');

const canViewAnalytics = (req, res, next) => {
    if (req.user.role === 'Admin' || req.user.role === 'Accounting') {
        return next();
    }
    req.flash('error_msg', 'Access Denied.');
    res.redirect('/dashboard');
};

router.get('/', ensureAuthenticated, canViewAnalytics, analyticsController.getAnalyticsDashboard);

module.exports = router;