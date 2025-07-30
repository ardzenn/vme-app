const User = require('../models/User');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const CheckIn = require('../models/CheckIn');
const DailyPlan = require('../models/DailyPlan');
const WeeklyItinerary = require('../models/WeeklyItinerary');
const DailyReport = require('../models/DailyReport');

const getDashboardData = async (req, res, userRole) => {
    try {
        const stats = {
            totalUsers: await User.countDocuments(),
            pendingUsers: await User.countDocuments({ role: 'Pending' }),
            checkInsToday: await CheckIn.countDocuments({
                createdAt: { $gte: new Date().setHours(0,0,0,0) }
            })
        };

        const orders = await Order.find()
            .populate('user', 'firstName lastName profilePicture')
            .sort({ createdAt: -1 })
            .limit(50);

        const transactions = await Transaction.find()
            .populate('user', 'firstName lastName profilePicture role')
            .sort({ createdAt: -1 })
            .limit(50);

        const checkins = await CheckIn.find()
            .populate('user', 'firstName lastName')
            .populate('hospital', 'name')
            .populate('doctor', 'name')
            .sort({ createdAt: -1 })
            .limit(100);

        const users = await User.find()
            .select('firstName lastName username role profilePicture createdAt')
            .sort({ createdAt: -1 });

        const dailyPlans = await DailyPlan.find()
            .populate('user', 'firstName lastName')
            .sort({ createdAt: -1 })
            .limit(50);

        const weeklyItineraries = await WeeklyItinerary.find()
            .populate('user', 'firstName lastName')
            .sort({ createdAt: -1 })
            .limit(50);

        const dailyReports = await DailyReport.find()
            .populate('user', 'firstName lastName')
            .sort({ createdAt: -1 })
            .limit(50);

        return {
            stats,
            orders,
            transactions,
            checkins,
            users,
            dailyPlans,
            weeklyItineraries,
            dailyReports,
            currentUser: req.user
        };
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        throw error;
    }
};

exports.getAccountingDashboard = async (req, res) => {
    try {
        const data = await getDashboardData(req, res, 'Accounting');
        res.render('accounting-dashboard', data);
    } catch (error) {
        req.flash('error_msg', 'Error loading dashboard');
        res.redirect('/dashboard');
    }
};