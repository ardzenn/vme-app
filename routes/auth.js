const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Ensure path is correct

const router = express.Router();

// Signup Route (remains the same)
router.get('/signup', (req, res) => res.render('signup'));
router.post('/signup', async (req, res) => {
    // ... your existing signup code ...
});

// Login Route (with new debugging)
router.get('/login', (req, res) => res.render('login', { error: null }));

router.post('/login', async (req, res) => {
    // --- CHECKPOINT 1 ---
    console.log('LOGIN CHECKPOINT 1: POST /login route has been hit.');

    const { username, password } = req.body;
    try {
        // --- CHECKPOINT 2 ---
        console.log(`LOGIN CHECKPOINT 2: Attempting to find user "${username}" in the database.`);
        
        const user = await User.findOne({ username });

        // --- CHECKPOINT 3 ---
        console.log('LOGIN CHECKPOINT 3: Database query finished.', user ? `Found user: ${user.username}` : 'User not found.');

        if (!user) {
            return res.render('login', { error: 'Invalid credentials' });
        }

        const isMatch = await user.comparePassword(password);
        
        // --- CHECKPOINT 4 ---
        console.log('LOGIN CHECKPOINT 4: Password comparison finished.');

        if (!isMatch) {
            return res.render('login', { error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user._id, role: user.role, firstName: user.firstName }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.cookie('token', token, { httpOnly: true });
        res.redirect('/dashboard');

    } catch (err) {
        // --- CHECKPOINT 5 (ERROR) ---
        console.error('LOGIN CHECKPOINT 5: An error occurred in the login process.', err);
        res.render('login', { error: 'An error occurred. Please try again.' });
    }
});


// Logout Route
router.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/login');
});


module.exports = router;