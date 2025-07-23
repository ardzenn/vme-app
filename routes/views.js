const express = require('express');
const { ensureAuthenticated, ensureAdmin, ensureAccounting } = require('../middleware/auth');
const viewController = require('../controllers/viewController');
const router = express.Router();

// --- Public Routes ---
router.get('/login', viewController.getLoginPage);
router.get('/signup', viewController.getSignupPage);
router.get('/forgot-password', viewController.getForgotPasswordPage);
router.get('/reset-password/:token', viewController.getResetPasswordPage);

// --- Authenticated Main Views ---
router.get('/dashboard', ensureAuthenticated, viewController.getDashboard);
router.get('/profile', ensureAuthenticated, viewController.getProfilePage);
router.get('/bookorder', ensureAuthenticated, viewController.getBookOrderPage);
router.get('/chat', ensureAuthenticated, viewController.getChatPage);

// --- Role-Specific Dashboards ---
router.get('/admin-dashboard', ensureAuthenticated, ensureAdmin, viewController.getAdminDashboard);
router.get('/accounting-dashboard', ensureAuthenticated, ensureAccounting, viewController.getAccountingDashboard);

router.get('/', (req, res) => {
    // If the user is already logged in, send them to their dashboard.
    if (req.isAuthenticated()) {
        return res.redirect('/dashboard');
    }
    // If they are not logged in, send them to the login page.
    res.redirect('/login');
});


module.exports = router;
