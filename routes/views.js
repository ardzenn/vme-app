const express = require('express');
const router = express.Router();
const viewController = require('../controllers/viewController');
const { ensureAuthenticated, ensureAdmin, ensureAccounting, ensureHasRole } = require('../middleware/auth');

// This single route intelligently redirects users to their correct dashboard
router.get('/dashboard', ensureAuthenticated, viewController.getDashboard);

// Admin and Accounting specific dashboard routes
router.get('/admin-dashboard', ensureAuthenticated, ensureAdmin, viewController.getAdminDashboard);
router.get('/accounting-dashboard', ensureAuthenticated, ensureAccounting, viewController.getAccountingDashboard);

// Inventory and Sales Manager dashboard routes
router.get('/inventory-dashboard', ensureAuthenticated, ensureHasRole(['Inventory', 'Admin']), viewController.getInventoryDashboard);
router.get('/sales-manager-dashboard', ensureAuthenticated, ensureHasRole(['Sales Manager', 'Admin']), viewController.getSalesManagerDashboard);

// Other page routes
router.get('/profile', ensureAuthenticated, viewController.getProfilePage);
router.get('/bookorder', ensureAuthenticated, viewController.getBookOrderPage);
router.get('/manage-entries', ensureAuthenticated, viewController.getManageEntriesPage);

// Test route to check authentication status
router.get('/auth-test', (req, res) => {
    const authStatus = {
        isAuthenticated: req.isAuthenticated(),
        user: req.user ? {
            id: req.user._id,
            username: req.user.username,
            role: req.user.role,
            isAdmin: req.user.role === 'Admin',
            isAccounting: ['Accounting', 'Sales Manager', 'Inventory', 'Admin'].includes(req.user.role)
        } : null,
        session: req.session,
        headers: req.headers
    };
    res.json(authStatus);
});

// Root route redirects to dashboard if logged in, otherwise to login
router.get('/', (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/dashboard');
    }
    res.redirect('/login');
});

// Mount IT dashboard route
router.use('/it-dashboard', require('./it-dashboard'));

module.exports = router;