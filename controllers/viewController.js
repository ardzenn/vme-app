const User = require('../models/User');
const Order = require('../models/Order');
const CheckIn = require('../models/CheckIn');
const Hospital = require('../models/Hospital');
const Doctor = require('../models/Doctor');
const Transaction = require('../models/Transaction');
const DailyPlan = require('../models/DailyPlan');
const WeeklyItinerary = require('../models/WeeklyItinerary');
const DailyReport = require('../models/DailyReport');
const Product = require('../models/Product');
const moment = require('moment-timezone');

const formatDates = (items) => {
    if (!items || items.length === 0) return [];
    return items.map(item => {
        const newItem = item.toObject();
        const userTimezone = 'Asia/Manila';
        if (newItem.createdAt) {
            newItem.createdAtFormatted = moment(item.createdAt).tz(userTimezone).format('M/D/YYYY, h:mm:ss A');
            newItem.dateOnlyFormatted = moment(item.createdAt).tz(userTimezone).format('M/D/YYYY');
        }
        if (newItem.planDate) {
            newItem.planDateFormatted = moment(item.planDate).tz(userTimezone).format('M/D/YYYY');
        }
        if (newItem.weekStartDate) {
            newItem.weekStartDateFormatted = moment(item.weekStartDate).tz(userTimezone).format('M/D/YYYY');
        }
        return newItem;
    });
};

// MODIFIED: This now redirects the new roles to the correct dashboard
exports.getDashboard = (req, res) => {
    const userRole = req.user.role;
    if (userRole === 'Admin' || userRole === 'IT') {
        return res.redirect('/admin-dashboard');
    } else if (['Accounting', 'Sales Manager', 'Inventory'].includes(userRole)) {
        return res.redirect('/accounting-dashboard');
    } else {
        return exports.getMSRDashboard(req, res);
    }
};

exports.getMSRDashboard = async (req, res) => {
    try {
        const stats = {
            checkinsToday: await CheckIn.countDocuments({ user: req.user.id, createdAt: { $gte: new Date().setHours(0, 0, 0, 0) } }),
            pendingOrders: await Order.countDocuments({ user: req.user.id, status: 'Pending' }),
            totalSales: await Order.aggregate([
                { $match: { user: req.user.id, status: 'Delivered' } },
                { $group: { _id: null, total: { $sum: '$subtotal' } } }
            ]).then(result => result[0] ? result[0].total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00')
        };
        
        let [checkins, orders, allHospitals, allDoctors, dailyPlans, weeklyItineraries] = await Promise.all([
            CheckIn.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(10).populate('hospital doctor'),
            Order.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(10),
            Hospital.find({ createdBy: req.user.id }),
            Doctor.find({ createdBy: req.user.id }).populate('hospital'),
            DailyPlan.find({ user: req.user.id }).sort({ planDate: -1 }).limit(10),
            WeeklyItinerary.find({ user: req.user.id }).sort({ weekStartDate: -1 }).limit(10)
        ]);

        res.render('dashboard', { 
            user: req.user, 
            stats, 
            checkins: formatDates(checkins), 
            orders: formatDates(orders), 
            allHospitals, 
            allDoctors, 
            dailyPlans: formatDates(dailyPlans), 
            weeklyItineraries: formatDates(weeklyItineraries),
            currentUser: req.user
        });
    } catch (err) {
        console.error("Dashboard Error:", err);
        req.flash('error_msg', 'Could not load dashboard.');
        res.redirect('/login');
    }
};

exports.getAdminDashboard = async (req, res) => {
    try {
        const stats = {
            totalUsers: await User.countDocuments(),
            pendingUsers: await User.countDocuments({ role: 'Pending' }),
            checkInsToday: await CheckIn.countDocuments({ createdAt: { $gte: new Date().setHours(0, 0, 0, 0) } }),
        };
        let [users, orders, transactions, checkins, dailyPlans, weeklyItineraries, dailyReports] = await Promise.all([
            User.find(),
            Order.find().populate('user', 'firstName lastName').sort({ createdAt: -1 }),
            Transaction.find().populate('user', 'firstName lastName').sort({ createdAt: -1 }),
            CheckIn.find().sort({ createdAt: -1 }).populate('user hospital doctor'),
            DailyPlan.find().populate('user', 'firstName lastName').sort({ planDate: -1 }),
            WeeklyItinerary.find().populate('user', 'firstName lastName').sort({ weekStartDate: -1 }),
            DailyReport.find().populate('user', 'firstName lastName').sort({ reportDate: -1 })
        ]);

        res.render('admin-dashboard', { 
            stats, 
            users, 
            orders: formatDates(orders), 
            transactions: formatDates(transactions), 
            checkins: formatDates(checkins), 
            dailyPlans: formatDates(dailyPlans), 
            weeklyItineraries: formatDates(weeklyItineraries), 
            dailyReports, 
            currentUser: req.user 
        });
    } catch (err) {
        console.error("Admin Dashboard Error:", err);
        req.flash('error_msg', 'Could not load admin dashboard.');
        res.redirect('/dashboard');
    }
};

exports.getAccountingDashboard = async (req, res) => {
    try {
        const stats = {
            totalUsers: await User.countDocuments(),
            pendingUsers: await User.countDocuments({ role: 'Pending' }),
            checkInsToday: await CheckIn.countDocuments({ createdAt: { $gte: new Date().setHours(0, 0, 0, 0) } }),
        };
        let [users, orders, transactions, checkins, dailyPlans, weeklyItineraries, dailyReports] = await Promise.all([
            User.find(),
            Order.find().populate('user').sort({ createdAt: -1 }),
            Transaction.find().populate('user').sort({ createdAt: -1 }),
            CheckIn.find().populate('user hospital doctor').sort({ createdAt: -1 }),
            DailyPlan.find().populate('user').sort({ planDate: -1 }),
            WeeklyItinerary.find().populate('user').sort({ weekStartDate: -1 }),
            DailyReport.find().populate('user').sort({ reportDate: -1 })
        ]);
        
        res.render('accounting-dashboard', { 
            stats, 
            users, 
            orders: formatDates(orders), 
            transactions: formatDates(transactions), 
            checkins: formatDates(checkins), 
            dailyPlans: formatDates(dailyPlans), 
            weeklyItineraries: formatDates(weeklyItineraries), 
            dailyReports, 
            currentUser: req.user 
        });
    } catch (err) {
        console.error("Accounting Dashboard Error:", err);
        req.flash('error_msg', 'Could not load accounting dashboard.');
        res.redirect('/dashboard');
    }
};

exports.getProfilePage = (req, res) => {
    res.render('profile', { user: req.user });
};

exports.getBookOrderPage = async (req, res) => {
    try {
        const products = await Product.find().sort({ name: 1 });
        res.render('bookorder', { products });
    } catch (err) {
        req.flash('error_msg', 'Could not load the booking page.');
        res.redirect('/dashboard');
    }
};

exports.getManageEntriesPage = async (req, res) => {
    try {
        const myHospitals = await Hospital.find({ createdBy: req.user.id }).sort({ name: 1 });
        const myDoctors = await Doctor.find({ createdBy: req.user.id }).populate('hospital').sort({ name: 1 });
        res.render('manage-entries', { myHospitals, myDoctors });
    } catch (err) {
        req.flash('error_msg', 'Could not load your entries.');
        res.redirect('/dashboard');
    }
};

exports.getCheckInPage = async (req, res) => {
    try {
        const allHospitals = await Hospital.find({ createdBy: req.user.id }).sort({ name: 1 });
        const allDoctors = await Doctor.find({ createdBy: req.user.id }).sort({ name: 1 });
        res.render('checkin-form', { allHospitals, allDoctors });
    } catch (err) {
        req.flash('error_msg', 'Could not load check-in page.');
        res.redirect('/dashboard');
    }
};