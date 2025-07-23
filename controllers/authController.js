const User = require('../models/User');
const passport = require('passport');
const crypto = require('crypto');
const sgMail = require('@sendgrid/mail');
const { validationResult } = require('express-validator');

// --- Signup, Login, Logout ---
exports.signup = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error_msg', errors.array()[0].msg);
        return res.redirect('/signup');
    }

    const { username, firstName, lastName, password } = req.body;
    // Role is intentionally omitted; it should be set to 'Pending' by default
    const newUser = new User({ username, firstName, lastName });
    
    User.register(newUser, password, (err, user) => {
        if (err) {
            req.flash('error_msg', err.message);
            return res.redirect('/signup');
        }
        passport.authenticate('local')(req, res, () => {
            req.flash('success_msg', 'You are now registered! Your account is pending admin approval.');
            res.redirect('/login');
        });
    });
};

exports.login = (req, res) => {
    const redirectUrl = req.user.role === 'Admin' ? '/admin-dashboard' : '/dashboard';
    req.flash('success_msg', 'You are now logged in!');
    res.redirect(redirectUrl);
};

exports.logout = (req, res, next) => {
    req.logout((err) => {
        if (err) { return next(err); }
        req.flash('success_msg', 'You have successfully logged out.');
        res.redirect('/login');
    });
};

// --- Password Reset Logic (Using SendGrid) ---
exports.forgotPassword = async (req, res) => {
    try {
        const token = crypto.randomBytes(20).toString('hex');
        const user = await User.findOne({ username: req.body.username });

        if (!user) {
            req.flash('error_msg', 'No account with that email address exists.');
            return res.redirect('/forgot-password');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
            console.error("FATAL ERROR: SendGrid credentials not set in .env file.");
            req.flash('error_msg', 'Server error: The email service is not configured correctly.');
            return res.redirect('/forgot-password');
        }
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);

        const msg = {
            to: user.username,
            from: { name: 'VME App Support', email: process.env.SENDGRID_FROM_EMAIL },
            subject: 'VME App Password Reset Request',
            text: `You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\nPlease click on the following link, or paste this into your browser to complete the process within one hour:\n\nhttp://${req.headers.host}/reset-password/${token}\n\nIf you did not request this, please ignore this email and your password will remain unchanged.\n`
        };

        await sgMail.send(msg);

        req.flash('success_msg', 'An e-mail has been sent to ' + user.username + ' with further instructions.');
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
        res.redirect('/forgot-password');
    }
};
