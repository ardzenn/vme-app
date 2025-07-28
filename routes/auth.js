const express = require('express');
const router = express.Router();
const passport = require('passport');
const authController = require('../controllers/authController');

// --- Page Rendering Routes ---
router.get('/login', authController.getLoginPage);
router.get('/signup', authController.getSignupPage);
router.get('/logout', authController.logoutUser);
router.get('/forgot-password', authController.getForgotPasswordPage);
router.get('/reset-password/:token', authController.getResetPasswordPage);

// --- Form Submission Routes ---
router.post('/login',
    passport.authenticate('local', {
        failureRedirect: '/login',
        failureFlash: true
    }),
    authController.handleLogin
);
router.post('/signup', authController.registerUser);
router.post('/forgot-password', authController.postForgotPassword);
router.post('/reset-password/:token', authController.postResetPassword);

module.exports = router;