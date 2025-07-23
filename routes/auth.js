const express = require('express'); 
const passport = require('passport');
const authController = require('../controllers/authController');
const { validateSignup, validatePasswordReset } = require('../middleware/validators');

const router = express.Router();

// --- Authentication Routes ---
router.post('/signup', validateSignup, authController.signup);

router.post('/login', passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash: true
}), authController.login);

router.get('/logout', authController.logout);

// --- Password Reset Routes ---
router.post('/forgot-password', authController.forgotPassword);

router.post('/reset-password/:token', validatePasswordReset, authController.resetPassword);

module.exports = router;
