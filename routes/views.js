const express = require('express');
const viewController = require('../controllers/viewController');
const { ensureAuthenticated, ensureAdmin, ensureAccounting } = require('../middleware/auth'); // Assuming you have role middleware

const router = express.Router();

// --- Public Routes ---
router.get('/login', viewController.getLoginPage);
router.get('/signup', viewController.getSignupPage);
router.get('/forgot-password', viewController.getForgotPasswordPage);
router.get('/reset-password/:token', viewController.getResetPasswordPage);

// --- Authenticated User Routes ---
router.get('/dashboard', ensureAuthenticated, viewController.getDashboard);
router.get('/profile', ensureAuthenticated, viewController.getProfilePage);
router.get('/bookorder', ensureAuthenticated, viewController.getBookOrderPage);
router.get('/chat', ensureAuthenticated, viewController.getChatPage);

// --- Role-Specific Routes ---
router.get('/admin-dashboard', ensureAuthenticated, ensureAdmin, viewController.getAdminDashboard);
router.get('/accounting-dashboard', ensureAuthenticated, ensureAccounting, viewController.getAccountingDashboard);


module.exports = router;
