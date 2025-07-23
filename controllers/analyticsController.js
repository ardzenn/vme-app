// in controllers/analyticsController.js
const Order = require('../models/Order');
const User = require('../models/User');
const CheckIn = require('../models/CheckIn');
const Collection = require('../models/Collection');

exports.getAnalyticsDashboard = async (req, res) => {
    try {
        // --- Fetch all necessary data in parallel ---
        const [users, orders, checkIns, collections] = await Promise.all([
            User.find({ role: { $in: ['MSR', 'KAS'] } }).select('firstName lastName'),
            Order.find({ status: { $in: ['Delivered', 'Order Shipped', 'Processing'] } }).populate('user', 'firstName lastName'),
            CheckIn.find().populate('user', 'firstName lastName'),
            Collection.find()
        ]);

        // --- Calculate Key Performance Indicators (KPIs) ---
        const totalSales = orders.reduce((sum, order) => sum + order.subtotal, 0);
        const totalCollections = collections.reduce((sum, coll) => sum + (coll.amount || 0), 0);
        const totalCheckIns = checkIns.length;
        const totalOrders = orders.length;

        // --- Process data for charts ---
        const salesByUser = {};
        orders.forEach(order => {
            if (order.user) {
                const userName = `${order.user.firstName} ${order.user.lastName}`;
                salesByUser[userName] = (salesByUser[userName] || 0) + order.subtotal;
            }
        });

        const checkInsByUser = {};
        checkIns.forEach(checkin => {
            if (checkin.user) {
                const userName = `${checkin.user.firstName} ${checkin.user.lastName}`;
                checkInsByUser[userName] = (checkInsByUser[userName] || 0) + 1;
            }
        });

        // Prepare data specifically for Chart.js
        const salesChartData = {
            labels: Object.keys(salesByUser),
            data: Object.values(salesByUser)
        };
        const checkInsChartData = {
            labels: Object.keys(checkInsByUser),
            data: Object.values(checkInsByUser)
        };

        const analyticsData = {
            kpis: {
                totalSales,
                totalCollections,
                totalCheckIns,
                totalOrders
            },
            charts: {
                salesByUser: salesChartData,
                checkInsByUser: checkInsChartData
            }
        };

        res.render('analytics-dashboard', { analyticsData });

    } catch (err) {
        console.error("Analytics Error:", err);
        req.flash('error_msg', 'Could not load analytics data.');
        res.redirect('/admin-dashboard');
    }
};