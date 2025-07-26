const User = require('../models/User');
const passport = require('passport');
const crypto = require('crypto');
const sgMail = require('@sendgrid/mail');
const { validationResult } = require('express-validator');

// --- Page Renders ---
exports.getLoginPage = (req, res) => {
    if (req.isAuthenticated()) { return res.redirect('/dashboard'); }
    res.render('login');
};

exports.getSignupPage = (req, res) => {
    if (req.isAuthenticated()) { return res.redirect('/dashboard'); }
    res.render('signup');
};

exports.getForgotPasswordPage = (req, res) => {
    res.render('forgot-password');
};

exports.getResetPasswordPage = async (req, res) => {
    try {
        const user = await User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } });
        if (!user) {
            req.flash('error_msg', 'Password reset token is invalid or has expired.');
            return res.redirect('/forgot-password');
        }
        res.render('reset-password', { token: req.params.token });
    } catch (err) {
        req.flash('error_msg', 'An error occurred.');
        res.redirect('/forgot-password');
    }
};


// --- Form Handlers ---
exports.postLogin = passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/login',
    failureFlash: true
});

exports.postSignup = (req, res) => {
    const { username, firstName, lastName, password } = req.body;
    User.register(new User({ username, firstName, lastName, role: 'Pending' }), password, (err, user) => {
        if (err) {
            req.flash('error_msg', err.message);
            return res.redirect('/signup');
        }
        passport.authenticate('local')(req, res, () => {
            req.flash('success_msg', 'Registration successful! Your account is now pending admin approval.');
            res.redirect('/login');
        });
    });
};

exports.postLogout = (req, res, next) => {
    req.logout(function(err) {
        if (err) { return next(err); }
        req.flash('success_msg', 'You are logged out.');
        res.redirect('/login');
    });
};

// --- Password Reset Logic (Preserved from your original file) ---
exports.forgotPassword = async (req, res) => {
    try {
        const user = await User.findOne({ username: req.body.username });
        if (!user) {
            req.flash('success_msg', 'If an account with that email exists, a password reset link has been sent.');
            return res.redirect('/forgot-password');
        }
        const token = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        const msg = {
            to: user.username,
            from: process.env.FROM_EMAIL,
            subject: 'VME App Password Reset',
            text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\nPlease click on the following link, or paste this into your browser to complete the process:\n\nhttp://${req.headers.host}/reset-password/${token}\n\nIf you did not request this, please ignore this email and your password will remain unchanged.\n`
        };
        await sgMail.send(msg);
        req.flash('success_msg', 'A password reset link has been sent to your email.');
        res.redirect('/forgot-password');
    } catch (err) {
        console.error('FORGOT PASSWORD ERROR:', err);
        req.flash('error_msg', 'An error occurred. Please try again.');
        res.redirect('/forgot-password');
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() }
        });
        if (!user) {
            req.flash('error_msg', 'Password reset token is invalid or has expired.');
            return res.redirect('/forgot-password');
        }
        if (req.body.password !== req.body.confirmPassword) {
            req.flash('error_msg', 'Passwords do not match.');
            return res.redirect('back');
        }
        await user.setPassword(req.body.password);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        req.login(user, (err) => {
            if (err) {
                req.flash('error_msg', 'Could not log you in after password reset. Please log in manually.');
                return res.redirect('/login');
            }
            req.flash('success_msg', 'Success! Your password has been changed.');
            res.redirect('/dashboard');
        });
    } catch (err) {
        console.error('RESET PASSWORD ERROR:', err);
        req.flash('error_msg', 'An error occurred. Please try again.');
        res.redirect('back');
    }
};