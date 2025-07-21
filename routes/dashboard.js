const express = require('express');
const { authMiddleware } = require('./auth');
const Order = require('../models/Order.js');
const CheckIn = require('../models/CheckIn.js');
const User = require('../models/User.js');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
    try {
        const { id: userId, role: userRole } = req.user;

        if (userRole === 'Admin') {
            let [users, allCheckins, allOrders] = await Promise.all([
                User.find({}).sort({ username: 1 }),
                CheckIn.find({}).populate('user hospital doctor').sort({ 'location.timestamp': -1 }),
                Order.find({}).populate('user').sort({ timestamp: -1 })
            ]);

            // THIS IS THE FIX: Filter out records with missing populated data
            allCheckins = allCheckins.filter(c => c.user && c.hospital && c.doctor);
            allOrders = allOrders.filter(o => o.user);

            const pendingUsers = users.filter(u => u.role === 'Pending').length;
            
            return res.render('admin-dashboard', {
                user: req.user,
                users,
                checkins: allCheckins,
                orders: allOrders,
                stats: { 
                    totalUsers: users.length,
                    pendingUsers: pendingUsers,
                    totalCheckins: allCheckins.length
                }
            });
        }

        // --- Logic for MSR / KAS Users ---
        // (This logic remains the same)
        const [orders, checkins] = await Promise.all([
            Order.find({ user: userId }).sort({ timestamp: -1 }),
            CheckIn.find({ user: userId }).populate('user hospital doctor').sort({ 'location.timestamp': -1 })
        ]);
        // ... (rest of MSR/KAS logic is correct)
        
    } catch (err) {
        console.error('Dashboard loading error:', err);
        res.status(500).send('Error loading dashboard');
    }
});

module.exports = router;