const User = require('../models/User');
const Order = require('../models/Order');
const CheckIn = require('../models/CheckIn');
const Collection = require('../models/Collection');

// --- Authentication Page Renderers ---
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

// --- Main Application Page Renderers ---
exports.getDashboard = async (req, res) => {
    try {
        const userRole = req.user.role;

        if (userRole === 'Admin') {
            return res.redirect('/admin-dashboard');
        } else if (userRole === 'Accounting') {
            return res.redirect('/accounting-dashboard');
        } else if (userRole === 'Pending') {
            return res.render('pending');
        } else {
            // Default dashboard for MSR, KAS, etc.
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Fetch all data for the logged-in user in parallel
            const [orders, checkIns, checkinsTodayCount, pendingOrdersCount] = await Promise.all([
                Order.find({ user: req.user.id }).sort({ createdAt: -1 }),
                CheckIn.find({ user: req.user.id }).populate('hospital doctor').sort({ createdAt: -1 }),
                CheckIn.countDocuments({ user: req.user.id, createdAt: { $gte: today } }),
                Order.countDocuments({ user: req.user.id, status: 'Pending' })
            ]);

            // Calculate total sales from the orders that have been processed or delivered
            const totalSales = orders.reduce((sum, order) => {
                if (['Delivered', 'Order Shipped', 'Processing'].includes(order.status)) {
                    return sum + (order.subtotal || 0);
                }
                return sum;
            }, 0);

            // Create the stats object to pass to the template
            const stats = {
                checkinsToday: checkinsTodayCount,
                pendingOrders: pendingOrdersCount,
                totalSales: totalSales.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })
            };

            // Render the dashboard and pass all necessary data
            res.render('dashboard', {
                user: req.user,
                orders,
                checkins: checkIns,
                stats: stats
            });
        }
    } catch (err) {
        console.error("Dashboard Error:", err);
        req.flash('error_msg', 'Could not load dashboard data.');
        res.redirect('/login');
    }
};

exports.getAdminDashboard = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [users, orders, checkIns, pendingUsersCount, checkInsTodayCount] = await Promise.all([
            User.find().sort({ createdAt: -1 }),
            Order.find().populate('user', 'firstName lastName profilePicture').sort({ createdAt: -1 }),
            CheckIn.find().populate('user hospital doctor').sort({ createdAt: -1 }),
            User.countDocuments({ role: 'Pending' }),
            CheckIn.countDocuments({ createdAt: { $gte: today } })
        ]);

        res.render('admin-dashboard', {
            user: req.user,
            users,
            orders,
            checkins: checkIns,
            stats: {
                totalUsers: users.length,
                pendingUsers: pendingUsersCount,
                checkInsToday: checkInsTodayCount
            }
        });
    } catch (err) {
        console.error("Admin Dashboard Error:", err);
        req.flash('error_msg', 'A critical error occurred while loading the admin dashboard.');
        // FIX: Redirect to a safe page that won't cause a redirect loop.
        res.redirect('/profile');
    }
};

exports.getAccountingDashboard = async (req, res) => {
    try {
        // Fetch all required data in parallel for efficiency
        const [orders, collections, checkins, users] = await Promise.all([
            Order.find().populate('user', 'firstName lastName').sort({ createdAt: -1 }),
            Collection.find().populate('user', 'firstName lastName').sort({ createdAt: -1 }),
            CheckIn.find().populate('user hospital doctor').sort({ createdAt: -1 }),
            User.find().sort({ createdAt: -1 }) // Also fetch users for the map tab
        ]);

        res.render('accounting-dashboard', { 
            user: req.user, 
            orders, 
            collections,
            checkins, // Now passing the checkins variable
            users // Also passing the users variable
        });

    } catch (err) {
        console.error("Accounting Dashboard Error:", err);
        req.flash('error_msg', 'Could not load accounting dashboard data.');
        res.redirect('/dashboard');
    }
};
exports.getProfilePage = (req, res) => { res.render('profile', { user: req.user }); };

exports.getBookOrderPage = (req, res) => { res.render('bookorder'); };

exports.getChatPage = async (req, res) => {
    try {
        const conversations = await User.find({ _id: { $ne: req.user.id } }).select('firstName lastName profilePicture');
        res.render('chat', { conversations });
    } catch (err) {
        console.error("Chat Page Error:", err);
        req.flash('error_msg', 'Could not load chat.');
        res.redirect('/dashboard');
    }
};
