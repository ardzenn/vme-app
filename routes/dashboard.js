const express = require('express');
const { authMiddleware } = require('../routes/auth');
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

            // Filter out any records that have missing populated data
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
        let [orders, checkins] = await Promise.all([
            Order.find({ user: userId }).populate('user').sort({ timestamp: -1 }),
            CheckIn.find({ user: userId }).populate('user hospital doctor').sort({ 'location.timestamp': -1 })
        ]);

        // Also filter here for safety
        checkins = checkins.filter(c => c.user && c.hospital && c.doctor);
        orders = orders.filter(o => o.user);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const checkinsToday = checkins.filter(c => c.location.timestamp >= today).length;
        const pendingOrdersCount = orders.filter(o => o.status === 'Pending').length;
        const totalSales = orders.reduce((sum, order) => sum + order.subtotal, 0);
        
        res.render('dashboard', {
            user: req.user,
            checkins,
            orders,
            stats: {
                checkinsToday: checkinsToday,
                pendingOrders: pendingOrdersCount,
                totalSales: totalSales.toLocaleString('en-US', { style: 'currency', currency: 'PHP', currencyDisplay: 'code' }).replace('PHP', '₱')
            }
        });

    } catch (err) {
        console.error('Dashboard loading error:', err);
        res.status(500).send('Error loading dashboard');
    }
});

module.exports = router;