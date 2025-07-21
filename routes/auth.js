const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');

const router = express.Router();

// --- Middleware Functions ---
const authMiddleware = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        return res.redirect('/login');
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.redirect('/login');
    }
};

const roleMiddleware = (roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
        return res.redirect('/dashboard');
    }
    next();
};

// --- Email Transporter Setup ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// --- Page Routes ---

router.get('/signup', (req, res) => res.render('signup', { error: null }));
router.post('/signup', async (req, res) => {
    try {
        const { username, password, firstName, lastName, birthdate, area, address } = req.body;
        const user = new User({ username, password, firstName, lastName, birthdate, area, address });
        await user.save();
        res.redirect('/login');
    } catch (err) {
        res.render('signup', { error: 'Error creating account. Email may be taken.' });
    }
});

router.get('/login', (req, res) => res.render('login', { error: null }));
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.render('login', { error: 'Invalid credentials' });
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.render('login', { error: 'Invalid credentials' });
        }
        const token = jwt.sign({ id: user._id, role: user.role, firstName: user.firstName }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
        res.redirect('/dashboard');
    } catch (err) {
        res.render('login', { error: 'An error occurred.' });
    }
});

router.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/login');
});

// --- PASSWORD RESET ROUTES ---

router.get('/forgot-password', (req, res) => {
    res.render('forgot-password', { error: null, success: null });
});

router.post('/forgot-password', async (req, res) => {
    try {
        const { username } = req.body;
        const user = await User.findOne({ username });
        if (!user) {
            return res.render('forgot-password', { error: 'No account with that email address exists.', success: null });
        }
        const token = crypto.randomBytes(20).toString('hex');
        user.passwordResetToken = token;
        user.passwordResetExpires = Date.now() + 3600000; // 1 hour
        await user.save();
        const resetURL = `${req.protocol}://${req.get('host')}/reset-password/${token}`;
        await transporter.sendMail({
            to: user.username, from: `VME App <${process.env.EMAIL_USER}>`,
            subject: 'VME App Password Reset',
            text: `Please click the following link to reset your password:\n\n${resetURL}`
        });
        res.render('forgot-password', { error: null, success: 'An email has been sent with further instructions.' });
    } catch (err) {
        res.render('forgot-password', { error: 'An error occurred sending the email.', success: null });
    }
});

router.get('/reset-password/:token', async (req, res) => {
    try {
        const user = await User.findOne({ passwordResetToken: req.params.token, passwordResetExpires: { $gt: Date.now() } });
        if (!user) {
            return res.render('forgot-password', { error: 'Password reset token is invalid or has expired.', success: null });
        }
        res.render('reset-password', { token: req.params.token, error: null });
    } catch (err) {
        res.render('forgot-password', { error: 'An error occurred.', success: null });
    }
});

router.post('/reset-password/:token', async (req, res) => {
    try {
        const user = await User.findOne({ passwordResetToken: req.params.token, passwordResetExpires: { $gt: Date.now() } });
        if (!user) {
            return res.render('forgot-password', { error: 'Password reset token is invalid or has expired.', success: null });
        }
        if (req.body.password !== req.body.confirmPassword) {
            return res.render('reset-password', { token: req.params.token, error: 'Passwords do not match.' });
        }
        user.password = req.body.password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();
        res.redirect('/login');
    } catch (err) {
        res.render('forgot-password', { error: 'An error occurred while resetting the password.', success: null });
    }
});


module.exports = {
    router: router,
    authMiddleware: authMiddleware,
    roleMiddleware: roleMiddleware
};