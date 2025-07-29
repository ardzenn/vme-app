const express = require('express');
const router = express.Router();
const passport = require('passport');
const authController = require('../controllers/authController');
const { ensureAuthenticated } = require('../middleware/auth');

// --- Login / Logout Routes ---
router.get('/login', authController.getLoginPage);

router.post('/login', 
    passport.authenticate('local', { 
        failureRedirect: '/login', 
        failureFlash: true 
    }), 
    authController.handleLogin
);

router.get('/logout', authController.logoutUser);


// --- Signup Route ---
router.get('/signup', authController.getSignupPage);
router.post('/signup', authController.registerUser);


// --- Forgot / Reset Password Routes ---
router.get('/forgot-password', authController.getForgotPasswordPage);
router.post('/forgot-password', authController.postForgotPassword);
router.get('/reset-password/:token', authController.getResetPasswordPage);
router.post('/reset-password/:token', authController.postResetPassword);

module.exports = router;