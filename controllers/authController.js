const User = require('../models/User');
const passport = require('passport');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

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
exports.registerUser = (req, res) => {
    const { username, firstName, lastName, password } = req.body;
    User.register(new User({ username, firstName, lastName, role: 'Pending' }), password, (err, user) => {
        if (err) {
            req.flash('error_msg', err.message);
            return res.redirect('/signup');
        }
        req.flash('success_msg', 'Registration successful! Your account is now pending admin approval.');
        res.redirect('/login');
    });
};

exports.handleLogin = (req, res) => {
    if (req.user.role === 'Pending') {
        req.logout(function(err) {
            if (err) { return next(err); }
            req.flash('error_msg', 'Your account is pending approval from an administrator.');
            return res.redirect('/login');
        });
    } else {
        res.redirect('/dashboard');
    }
};

exports.logoutUser = (req, res, next) => {
    req.logout(function(err) {
        if (err) { return next(err); }
        req.flash('success_msg', 'You are logged out.');
        res.redirect('/login');
    });
};

exports.postForgotPassword = async (req, res) => {
    try {
        const token = crypto.randomBytes(20).toString('hex');
        const user = await User.findOne({ username: req.body.username });
        if (!user) {
            req.flash('success_msg', 'If an account with that email exists, a password reset link has been sent.');
            return res.redirect('/forgot-password');
        }
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            to: user.username,
            from: `VME App <noreply@vme-app.com>`,
            subject: 'VME App Password Reset',
            text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\nPlease click on the following link, or paste this into your browser to complete the process:\n\nhttp://${req.headers.host}/reset-password/${token}\n\nIf you did not request this, please ignore this email and your password will remain unchanged.\n`
        };

        await transporter.sendMail(mailOptions);
        req.flash('success_msg', 'A password reset link has been sent to your email.');
        res.redirect('/forgot-password');
    } catch (err) {
        console.error('FORGOT PASSWORD ERROR:', err);
        req.flash('error_msg', 'An error occurred. Please check your .env file and email credentials.');
        res.redirect('/forgot-password');
    }
};

exports.postResetPassword = async (req, res) => {
    try {
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() }
        });
        if (!user) {
            req.flash('error_msg', 'Password reset token is invalid or has expired.');
            return res.redirect('/forgot-password');
        }
        if (req.body.password !== req.body.confirm) {
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