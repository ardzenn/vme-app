const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// --- GET Routes (to display pages) ---
router.get('/login', authController.getLoginPage);
router.get('/signup', authController.getSignupPage);
router.get('/forgot-password', authController.getForgotPasswordPage);
router.get('/reset-password/:token', authController.getResetPasswordPage);
router.get('/logout', authController.postLogout); // Logout can be a GET request for simplicity

// --- POST Routes (to handle form submissions) ---
router.post('/login', authController.postLogin);
router.post('/signup', authController.postSignup);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);

module.exports = router;