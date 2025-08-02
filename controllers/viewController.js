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
        if (newItem.reportDate) {
            newItem.reportDateFormatted = moment(item.reportDate).tz(userTimezone).format('M/D/YYYY');
        }
        return newItem;
    });
};

// MODIFIED: This now redirects the new roles to the correct dashboard
exports.getDashboard = (req, res) => {
    const userRole = req.user.role;
    if (userRole === 'Admin') {
        return res.redirect('/admin-dashboard');
    } else if (userRole === 'IT') {
        return res.redirect('/it-dashboard');
    } else if (userRole === 'Inventory') {
        return res.redirect('/inventory-dashboard');
    } else if (userRole === 'Sales Manager') {
        return res.redirect('/sales-manager-dashboard');
    } else if (userRole === 'Accounting') {
        return res.redirect('/accounting-dashboard');
    } else {
        return exports.getMSRDashboard(req, res);
    }
};

// IT Dashboard
exports.getITDashboard = async (req, res) => {
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
            CheckIn.find().populate('user hospital doctor').sort({ createdAt: -1 }),
            DailyPlan.find().populate('user').sort({ planDate: -1 }),
            WeeklyItinerary.find().populate('user').sort({ weekStartDate: -1 }),
            DailyReport.find().populate('user').sort({ reportDate: -1 })
        ]);
        res.render('it-dashboard', { 
            stats, 
            users, 
            orders: formatDates(orders), 
            transactions: formatDates(transactions), 
            checkins: formatDates(checkins), 
            dailyPlans: formatDates(dailyPlans), 
            weeklyItineraries: formatDates(weeklyItineraries), 
            dailyReports: formatDates(dailyReports), 
            currentUser: req.user 
        });
    } catch (err) {
        console.error("IT Dashboard Error:", err);
        req.flash('error_msg', 'Could not load IT dashboard.');
        res.redirect('/dashboard');
    }
};

exports.getMSRDashboard = async (req, res) => {
    try {
        let totalSales = '0.00';
        try {
            const agg = await Order.aggregate([
                { $match: { user: req.user.id, status: 'Delivered' } },
                { $group: { _id: null, total: { $sum: '$subtotal' } } }
            ]);
            totalSales = agg[0] && agg[0].total ? agg[0].total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
        } catch (err) {
            console.error('Error aggregating totalSales for MSR/KAS dashboard:', err);
            totalSales = '0.00';
        }
        const stats = {
            checkinsToday: await CheckIn.countDocuments({ user: req.user.id, createdAt: { $gte: new Date().setHours(0, 0, 0, 0) } }),
            pendingOrders: await Order.countDocuments({ user: req.user.id, status: 'Pending' }),
            totalSales
        };


        // Defensive fetching and logging
        let checkins = [], orders = [], allHospitals = [], allDoctors = [], dailyPlans = [], weeklyItineraries = [], dailyReports = [], transactions = [];
        try {
            [checkins, orders, allHospitals, allDoctors, dailyPlans, weeklyItineraries, dailyReports, transactions] = await Promise.all([
                CheckIn.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(10).populate('hospital doctor'),
                Order.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(10),
                Hospital.find({ createdBy: req.user.id }),
                Doctor.find({ createdBy: req.user.id }).populate('hospital'),
                DailyPlan.find({ user: req.user.id }).sort({ planDate: -1 }).limit(10),
                WeeklyItinerary.find({ user: req.user.id }).sort({ weekStartDate: -1 }).limit(10),
                DailyReport.find({ user: req.user.id }).sort({ reportDate: -1 }).limit(10),
                Transaction.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(10)
            ]);
        } catch (fetchErr) {
            console.error(`Dashboard DB fetch error for user ${req.user && req.user.id}:`, fetchErr);
            // If any fetch fails, keep arrays empty and continue
            checkins = checkins || [];
            orders = orders || [];
            allHospitals = allHospitals || [];
            allDoctors = allDoctors || [];
            dailyPlans = dailyPlans || [];
            weeklyItineraries = weeklyItineraries || [];
            dailyReports = dailyReports || [];
            transactions = transactions || [];
        }

        // Guarantee arrays for EJS
        checkins = Array.isArray(checkins) ? checkins : [];
        orders = Array.isArray(orders) ? orders : [];
        allHospitals = Array.isArray(allHospitals) ? allHospitals : [];
        allDoctors = Array.isArray(allDoctors) ? allDoctors : [];
        dailyPlans = Array.isArray(dailyPlans) ? dailyPlans : [];
        weeklyItineraries = Array.isArray(weeklyItineraries) ? weeklyItineraries : [];
        dailyReports = Array.isArray(dailyReports) ? dailyReports : [];
        transactions = Array.isArray(transactions) ? transactions : [];

        // Fetch all EOD reports for the current user for the new dashboard tab
        let reports = [];
        try {
            reports = await DailyReport.find({ user: req.user.id }).sort({ reportDate: -1 });
        } catch (e) {
            console.error('Error fetching EOD reports for dashboard:', e);
            reports = [];
        }
        reports = Array.isArray(reports) ? reports : [];

        res.render('dashboard', {
            user: req.user,
            stats,
            checkins: formatDates(checkins),
            orders: formatDates(orders),
            allHospitals,
            allDoctors,
            dailyPlans: formatDates(dailyPlans),
            weeklyItineraries: formatDates(weeklyItineraries),
            dailyReports: formatDates(dailyReports),
            transactions: formatDates(transactions),
            reports,
            currentUser: req.user
        });
    } catch (err) {
        console.error(`Dashboard Render Error for user ${req.user && req.user.id}:`, err);
        // Always pass all variables to prevent EJS ReferenceError
        res.render('dashboard', {
            user: req.user,
            stats: {},
            checkins: [],
            orders: [],
            allHospitals: [],
            allDoctors: [],
            dailyPlans: [],
            weeklyItineraries: [],
            dailyReports: [],
            transactions: [],
            reports: [],
            currentUser: req.user
        });
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

exports.getInventoryDashboard = async (req, res) => {
    try {
        const stats = {
            totalUsers: await User.countDocuments(),
            pendingUsers: await User.countDocuments({ role: 'Pending' }),
            checkInsToday: await CheckIn.countDocuments({ createdAt: { $gte: new Date().setHours(0, 0, 0, 0) } }),
        };
        // Inventory-specific data
        // Fetch all products and map to expected fields for the dashboard
        const products = await Product.find();
        const inventoryData = products.map(product => {
            const totalStock = typeof product.stock === 'number' ? product.stock : 0;
            return {
                _id: product._id,
                name: product.name,
                category: product.category,
                imageUrl: product.imageUrl,
                totalStock,
                stockItems: product.stockHistory || [],
                expiringSoonCount: 0, // No expiration logic in schema
                status: totalStock === 0 ? 'Out of Stock' : (totalStock <= 10 ? 'Low Stock' : 'In Stock'),
            };
        });
        // Fetch accounting tab panel data
        const [orders, transactions, checkins, dailyPlans, hospitals, doctors] = await Promise.all([
            Order.find().populate('user', 'firstName lastName profilePicture').sort({ createdAt: -1 }).limit(50),
            Transaction.find().populate('user', 'firstName lastName profilePicture role').sort({ createdAt: -1 }).limit(50),
            CheckIn.find().populate('user', 'firstName lastName profilePicture').populate('hospital').populate('doctor').sort({ createdAt: -1 }).limit(50),
            DailyPlan.find().populate('user', 'firstName lastName').sort({ createdAt: -1 }).limit(50),
            Hospital.find().sort({ name: 1 }),
            Doctor.find().sort({ name: 1 })
        ]);
        allHospitals = hospitals;
        allDoctors = doctors;
        res.render('inventory-dashboard', {
            stats,
            inventoryData: Array.isArray(inventoryData) ? inventoryData : [],
            recentMovements: [],
            orders,
            transactions,
            checkins,
            dailyPlans,
            currentUser: req.user
        });
    } catch (err) {
        console.error('Inventory Dashboard Error:', err);
        // Always pass all variables to prevent EJS ReferenceError
        res.render('inventory-dashboard', {
            stats: {},
            inventoryData: [],
            recentMovements: [],
            orders: [],
            transactions: [],
            checkins: [],
            dailyPlans: [],
            currentUser: req.user
        });
    }
};

exports.getSalesManagerDashboard = async (req, res) => {
    let allHospitals = [];
    let allDoctors = [];
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
        // Fetch hospitals and doctors for check-in modal
        allHospitals = await Hospital.find().sort({ name: 1 });
        allDoctors = await Doctor.find().sort({ name: 1 });
        // Fetch all EOD reports for the current user for the new dashboard tab
        let reports = [];
        try {
            reports = await DailyReport.find({ user: req.user.id }).sort({ reportDate: -1 });
        } catch (e) {
            console.error('Error fetching EOD reports for sales manager dashboard:', e);
            reports = [];
        }
        reports = Array.isArray(reports) ? reports : [];

        res.render('sales-manager-dashboard', {
            stats,
            users,
            orders: formatDates(orders),
            transactions: formatDates(transactions),
            checkins: formatDates(checkins),
            dailyPlans: formatDates(dailyPlans),
            weeklyItineraries: formatDates(weeklyItineraries),
            dailyReports: formatDates(dailyReports),
            reports,
            allHospitals,
            allDoctors,
            currentUser: req.user
        });
    } catch (err) {
        console.error('Sales Manager Dashboard Error:', err);
        // Always pass all variables to prevent EJS ReferenceError
        res.render('sales-manager-dashboard', {
            stats: {},
            salesStats: {},
            orders: [],
            transactions: [],
            checkins: [],
            dailyPlans: [],
            users: [],
            allHospitals: allHospitals,
            allDoctors: allDoctors,
            currentUser: req.user
        });
    }
};

exports.getAccountingDashboard = async (req, res) => {
    try {
        console.log('getAccountingDashboard - Starting...');
        console.log('getAccountingDashboard - Current user:', req.user);
        
        const stats = {
            totalUsers: await User.countDocuments(),
            pendingUsers: await User.countDocuments({ role: 'Pending' }),
            checkInsToday: await CheckIn.countDocuments({ createdAt: { $gte: new Date().setHours(0, 0, 0, 0) } }),
        };
        console.log('getAccountingDashboard - Stats calculated:', stats);
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