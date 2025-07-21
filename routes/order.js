const express = require('express');
const { authMiddleware } = require('./auth');
const Order = require('../models/Order.js');
const Message = require('../models/Message.js');
const User = require('../models/User.js');

// This function now returns a router that doesn't need the `io` object,
// as real-time is handled on the main app socket.
module.exports = function(io) {
    const router = express.Router();
    router.use(authMiddleware);

    // This route now fetches order/message data and returns it as JSON
    router.get('/:id', async (req, res) => {
        try {
            const order = await Order.findById(req.params.id).populate('user');
            if (!order) {
                return res.status(404).json({ message: "Order not found" });
            }

            // Also fetch the full user object for the currently logged-in user
            const currentUser = await User.findById(req.user.id);
            
            // Find messages and populate the user details, including profilePicture
            const messages = await Message.find({ order: req.params.id })
                .sort({ createdAt: 'asc' })
                .populate('user', 'username profilePicture'); // <-- Make sure to get the profile picture

            res.json({ order, messages, currentUser });
        } catch (err) {
            console.error("Error fetching order details:", err);
            res.status(500).json({ message: "Error loading order details." });
        }
    });
    
    // The book order routes can remain here if you have them
    // router.get('/book', ...)
    // router.post('/book', ...)

    return router;
};