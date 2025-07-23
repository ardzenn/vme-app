const User = require('../models/User');
const passport = require('passport');
const crypto = require('crypto');
const sgMail = require('@sendgrid/mail'); // Use SendGrid, not nodemailer
const { validationResult } = require('express-validator');

// --- Signup, Login, Logout ---

exports.signup = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error_msg', errors.array()[0].msg);
        return res.redirect('/signup');
    }

    const { username, firstName, lastName, role, password } = req.body;
    const newUser = new User({ username, firstName, lastName, role });
    
    User.register(newUser, password, (err, user) => {
        if (err) {
            req.flash('error_msg', err.message);
            return res.redirect('/signup');
        }
        passport.authenticate('local')(req, res, () => {
            req.flash('success_msg', 'You are now registered and logged in!');
            res.redirect('/dashboard');
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

        // --- CONFIGURE AND CHECK FOR SENDGRID ---
        if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
            console.error("FATAL ERROR: SENDGRID_API_KEY or SENDGRID_FROM_EMAIL is not set in the .env file.");
            req.flash('error_msg', 'Server error: The email service is not configured correctly.');
            return res.redirect('/forgot-password');
        }
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);

        const msg = {
            to: user.username,
            from: {
                name: 'VME App Support',
                email: process.env.SENDGRID_FROM_EMAIL,
            },
            subject: 'VME App Password Reset Request',
            text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n
                   Please click on the following link, or paste this into your browser to complete the process:\n\n
                   http://${req.headers.host}/reset-password/${token}\n\n
                   If you did not request this, please ignore this email and your password will remain unchanged.\n`
        };

        console.log("Attempting to send password reset email via SendGrid to:", user.username);
        await sgMail.send(msg);
        console.log("Email sent successfully via SendGrid.");

        req.flash('success_msg', 'An e-mail has been sent to ' + user.username + ' with further instructions.');
        res.redirect('/forgot-password');

    } catch (err) {
        console.error('FORGOT PASSWORD ERROR:', err);
        if (err.response) {
            console.error('SendGrid Error Body:', err.response.body)
        }
        req.flash('error_msg', 'An error occurred while trying to send the reset email. Please check the server logs.');
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

        await user.setPassword(req.body.password);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        req.login(user, (err) => {
            if (err) {
                console.error('LOGIN AFTER RESET ERROR:', err);
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
