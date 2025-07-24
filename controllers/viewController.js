const User = require('../models/User');
const Order = require('../models/Order');
const CheckIn = require('../models/CheckIn');
const Collection = require('../models/Collection');
const DailyPlan = require('../models/DailyPlan');
const WeeklyItinerary = require('../models/WeeklyItinerary');
const Hospital = require('../models/Hospital');
const Doctor = require('../models/Doctor');
const Transaction = require('../models/Transaction');

// --- Helper function to avoid repeating map URL code ---
const processCheckInsForMap = (checkIns) => {
    if (process.env.MAPBOX_TOKEN) {
        return checkIns.map(checkin => {
            if (checkin.location && checkin.location.lat && checkin.location.lng) {
                const [lng, lat] = [checkin.location.lng, checkin.location.lat];
                checkin.mapImageUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s-marker+f74e4e(${lng},${lat})/${lng},${lat},14,0/400x200?access_token=${process.env.MAPBOX_TOKEN}`;
            }
            return checkin;
        });
    }
    return checkIns; // Return original if no token
};

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
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let [orders, checkIns, checkinsTodayCount, pendingOrdersCount, allHospitals, allDoctors] = await Promise.all([
                Order.find({ user: req.user.id }).sort({ createdAt: -1 }),
                CheckIn.find({ user: req.user.id }).populate('hospital doctor').sort({ createdAt: -1 }),
                CheckIn.countDocuments({ user: req.user.id, createdAt: { $gte: today } }),
                Order.countDocuments({ user: req.user.id, status: 'Pending' }),
                Hospital.find({ $or: [{ createdBy: null }, { createdBy: req.user.id }] }).sort({ name: 1 }),
                Doctor.find({ $or: [{ createdBy: null }, { createdBy: req.user.id }] }).sort({ name: 1 })
            ]);

            checkIns = processCheckInsForMap(checkIns);

            const totalSales = orders.reduce((sum, order) => {
                if (['Delivered', 'Order Shipped', 'Processing'].includes(order.status)) {
                    return sum + (order.subtotal || 0);
                }
                return sum;
            }, 0);

            const stats = {
                checkinsToday: checkinsTodayCount,
                pendingOrders: pendingOrdersCount,
                totalSales: totalSales.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })
            };

            res.render('dashboard', {
                user: req.user,
                orders,
                checkins: checkIns,
                stats: stats,
                allHospitals,
                allDoctors
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

        let [users, orders, checkIns, transactions, pendingUsersCount, checkInsTodayCount, dailyPlans, weeklyItineraries] = await Promise.all([
            User.find().sort({ createdAt: -1 }),
            Order.find().populate('user', 'firstName lastName profilePicture').sort({ createdAt: -1 }),
            CheckIn.find().populate('user hospital doctor').sort({ createdAt: -1 }),
            Transaction.find().populate('user', 'firstName lastName').sort({ createdAt: -1 }), // <-- ADDED
            User.countDocuments({ role: 'Pending' }),
            CheckIn.countDocuments({ createdAt: { $gte: today } }),
            DailyPlan.find().populate('user', 'firstName lastName').sort({ planDate: -1 }),
            WeeklyItinerary.find().populate('user', 'firstName lastName').sort({ weekStartDate: -1 })
        ]);

        checkIns = processCheckInsForMap(checkIns);
        
        const stats = {
            totalUsers: users.length,
            pendingUsers: pendingUsersCount,
            checkInsToday: checkInsTodayCount
        };

        res.render('admin-dashboard', {
            user: req.user,
            users,
            orders,
            checkins: checkIns,
            transactions,
            stats: stats,
            dailyPlans,
            weeklyItineraries
        });
    } catch (err) {
        console.error("Admin Dashboard Error:", err);
        req.flash('error_msg', 'A critical error occurred while loading the admin dashboard.');
        res.redirect('/profile');
    }
};

exports.getAccountingDashboard = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let [orders, collections, checkIns, users, transactions, pendingUsersCount, checkInsTodayCount, dailyPlans, weeklyItineraries] = await Promise.all([
            Order.find().populate('user', 'firstName lastName').sort({ createdAt: -1 }),
            Collection.find().populate('user', 'firstName lastName').sort({ createdAt: -1 }),
            CheckIn.find().populate('user hospital doctor').sort({ createdAt: -1 }),
            User.find().sort({ createdAt: -1 }),
            Transaction.find().populate('user', 'firstName lastName').sort({ createdAt: -1 }), // <-- ADDED
            User.countDocuments({ role: 'Pending' }),
            CheckIn.countDocuments({ createdAt: { $gte: today } }),
            DailyPlan.find().populate('user', 'firstName lastName').sort({ planDate: -1 }),
            WeeklyItinerary.find().populate('user', 'firstName lastName').sort({ weekStartDate: -1 })
        ]);


        checkIns = processCheckInsForMap(checkIns);

        const stats = {
            totalUsers: users.length,
            pendingUsers: pendingUsersCount,
            checkInsToday: checkInsTodayCount
        };

        res.render('accounting-dashboard', { 
            user: req.user, 
            orders, 
            collections,
            checkins: checkIns,
            users,
             transactions,
            stats,
            dailyPlans,
            weeklyItineraries
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

exports.getManageEntriesPage = async (req, res) => {
    try {
        const myHospitals = await Hospital.find({ createdBy: req.user.id });
        const myDoctors = await Doctor.find({ createdBy: req.user.id }).populate('hospital');
        res.render('manage-entries', { myHospitals, myDoctors });
    } catch (err) {
        req.flash('error_msg', 'Could not load your entries.');
        res.redirect('/dashboard');
    }
};