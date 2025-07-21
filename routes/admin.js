const express = require('express');
const { authMiddleware, roleMiddleware } = require('./auth');
const User = require('../models/User.js');

const router = express.Router();

// Protect all admin routes
router.use(authMiddleware, roleMiddleware(['Admin']));

// Route to handle the form submission for assigning a role
router.post('/assign-role', async (req, res) => {
    try {
        const { userId, role } = req.body;
        await User.findByIdAndUpdate(userId, { role: role });
        res.redirect('/dashboard'); // Redirect back to the dashboard after success
    } catch (err) {
        console.error('Error assigning role:', err);
        res.redirect('/dashboard'); 
    }
});

module.exports = router;