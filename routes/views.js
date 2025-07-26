const express = require('express');
const router = express.Router();
const viewController = require('../controllers/viewController');
const { ensureAuthenticated, ensureAdmin, ensureAccounting } = require('../middleware/auth');

// This single route intelligently redirects users to their correct dashboard
router.get('/dashboard', ensureAuthenticated, viewController.getDashboard);

// Admin and Accounting specific dashboard routes
router.get('/admin-dashboard', ensureAuthenticated, ensureAdmin, viewController.getAdminDashboard);
router.get('/accounting-dashboard', ensureAuthenticated, ensureAccounting, viewController.getAccountingDashboard);

// Other page routes
router.get('/profile', ensureAuthenticated, viewController.getProfilePage);
router.get('/bookorder', ensureAuthenticated, viewController.getBookOrderPage);
router.get('/manage-entries', ensureAuthenticated, viewController.getManageEntriesPage);

// Root route redirects to dashboard if logged in, otherwise to login
router.get('/', (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/dashboard');
    }
    res.redirect('/login');
});

module.exports = router;