const express = require('express');
const router = express.Router();
const passport = require('passport');
const authController = require('../controllers/authController');
const { body } = require('express-validator');

// --- Validation Rules ---
const signupValidation = [
    body('username', 'Please enter a valid email address.').isEmail(),
    body('firstName', 'First name is required.').not().isEmpty(),
    body('password', 'Password must be at least 6 characters.').isLength({ min: 6 })
];

// --- Routes ---
router.post('/signup', signupValidation, authController.signup);

router.post('/login', passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash: true
}), authController.login);

router.get('/logout', authController.logout);

router.post('/forgot-password', authController.forgotPassword);

router.post('/reset-password/:token', authController.resetPassword);

module.exports = router;
