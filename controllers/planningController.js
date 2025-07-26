const DailyPlan = require('../models/DailyPlan');
const WeeklyItinerary = require('../models/WeeklyItinerary');
const CheckIn = require('../models/CheckIn');
const User = require('../models/User');
const { Parser } = require('json2csv'); // ADDED: Library for CSV export

// --- Weekly Itinerary Forms & Submission (No changes here) ---
exports.getWeeklyItineraryForm = async (req, res) => {
    try {
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1); 
        const startOfWeek = new Date(today.setDate(diff));
        startOfWeek.setHours(0, 0, 0, 0);
        const weekStartDate = startOfWeek.toISOString().split('T')[0];
        res.render('weekly-itinerary-form', { 
            weekStartDate, 
            itinerary: { dailyPlans: [] }
        });
    } catch (err) {
        req.flash('error_msg', 'Could not load the itinerary form.');
        res.redirect('/planning/my-plans');
    }
};

exports.getWeeklyItineraryForEdit = async (req, res) => {
    try {
        const itinerary = await WeeklyItinerary.findById(req.params.id);
        if (!itinerary || itinerary.user.toString() !== req.user.id) {
            req.flash('error_msg', 'Itinerary not found or you do not have permission to edit it.');
            return res.redirect('/planning/my-plans');
        }
        const weekStartDate = itinerary.weekStartDate.toISOString().split('T')[0];
        res.render('weekly-itinerary-form', { weekStartDate, itinerary });
    } catch (err) {
        req.flash('error_msg', 'Could not load the itinerary form.');
        res.redirect('/planning/my-plans');
    }
};

exports.submitWeeklyItinerary = async (req, res) => {
    try {
        const { weekPeriod, dailyPlans } = req.body;
        if (!dailyPlans || !dailyPlans.some(d => d && d.date)) {
             req.flash('error_msg', 'Please provide a date for at least one day in the plan.');
             return res.redirect('back');
        }
        const firstDate = new Date(dailyPlans.find(d => d && d.date).date);
        const dayOfWeek = firstDate.getUTCDay();
        const diff = firstDate.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const weekStartDate = new Date(firstDate.setUTCDate(diff));
        weekStartDate.setUTCHours(0, 0, 0, 0);

        let totalTargetSales = 0;
        let totalTargetCollections = 0;

        const processedDailyPlans = (dailyPlans || []).map(day => {
            if (!day || !day.date) return null;
            (day.salesObjectives || []).forEach(obj => totalTargetSales += parseFloat(obj.amount || 0));
            (day.collectionObjectives || []).forEach(obj => totalTargetCollections += parseFloat(obj.amount || 0));
            return {
                date: new Date(day.date),
                area: day.area,
                salesObjectives: (day.salesObjectives || []).filter(o => o.client && o.client.trim() !== ''),
                collectionObjectives: (day.collectionObjectives || []).filter(o => o.client && o.client.trim() !== ''),
                placesToVisit: (day.placesToVisit || []).filter(p => p.place && p.place.trim() !== '').map(p => ({
                    place: p.place,
                    doctors: (p.doctors || []).filter(d => d && d.trim() !== '')
                }))
            };
        }).filter(p => p !== null);

        const weekData = {
            user: req.user.id,
            weekStartDate,
            weekPeriod,
            dailyPlans: processedDailyPlans,
            totalTargetSales,
            totalTargetCollections
        };

        await WeeklyItinerary.findOneAndUpdate(
            { user: req.user.id, weekStartDate: weekData.weekStartDate },
            weekData,
            { new: true, upsert: true, runValidators: true }
        );
        req.flash('success_msg', 'Weekly itinerary saved successfully!');
        res.redirect('/planning/my-plans');
    } catch (err) {
        console.error("Error submitting weekly itinerary:", err);
        req.flash('error_msg', 'An error occurred while saving your itinerary.');
        res.redirect('back');
    }
};

exports.getPlanDetails = async (req, res) => {
    try {
        const { type, id } = req.params;
        let plan, planType = type;
        if (type === 'daily') {
            plan = await DailyPlan.findById(id).populate('user comments.user');
        } else if (type === 'weekly') {
            plan = await WeeklyItinerary.findById(id).populate('user comments.user');
        }
        if (!plan) {
            req.flash('error_msg', 'Plan not found.');
            return res.redirect(req.get('Referrer') || '/planning/my-plans');
        }
        res.render('planning-detail', { plan, planType });
    } catch (err) {
        console.error("Error getting plan details:", err);
        req.flash('error_msg', 'Could not load plan details.');
        res.redirect(req.get('Referrer') || '/planning/my-plans');
    }
};

exports.getMyPlans = async (req, res) => {
    try {
        const dailyPlans = await DailyPlan.find({ user: req.user.id }).sort({ planDate: -1 });
        const weeklyItineraries = await WeeklyItinerary.find({ user: req.user.id }).sort({ weekStartDate: -1 });
        res.render('my-plans', { dailyPlans, weeklyItineraries });
    } catch (err) {
        req.flash('error_msg', 'Could not load your plans.');
        res.redirect('/dashboard');
    }
};

exports.getDailyPlanForm = async (req, res) => {
    try {
        const planDate = new Date().toISOString().split('T')[0];
        let plan = await DailyPlan.findOne({ user: req.user.id, planDate: new Date(planDate) });
        if (!plan) {
            plan = {
                itinerary: [''],
                salesObjectives: [{ objective: '' }],
                targetCollections: {
                    current: [{ client: '', amount: '' }],
                    overdue: [{ client: '', siDrNumber: '', date: '', amount: '' }]
                }
            };
        }
        res.render('daily-plan-form', { planDate, plan });
    } catch (err) {
        req.flash('error_msg', 'Could not load daily plan form.');
        res.redirect('/planning/my-plans');
    }
};

exports.getDailyPlanForEdit = async (req, res) => {
    try {
        let plan = await DailyPlan.findById(req.params.id).lean();
        if (!plan || plan.user.toString() !== req.user.id) {
            req.flash('error_msg', 'Plan not found or you do not have permission to edit it.');
            return res.redirect('/planning/my-plans');
        }
        const planDate = plan.planDate.toISOString().split('T')[0];
        if (!plan.itinerary || plan.itinerary.length === 0) plan.itinerary = [''];
        if (!plan.salesObjectives || plan.salesObjectives.length === 0) plan.salesObjectives = [{ objective: '' }];
        if (!plan.targetCollections) plan.targetCollections = {};
        if (!plan.targetCollections.current || plan.targetCollections.current.length === 0) plan.targetCollections.current = [{ client: '', amount: '' }];
        if (!plan.targetCollections.overdue || plan.targetCollections.overdue.length === 0) plan.targetCollections.overdue = [{ client: '', siDrNumber: '', date: null, amount: '' }];
        res.render('daily-plan-form', { planDate, plan });
    } catch (err) {
        req.flash('error_msg', 'Could not load the daily plan form.');
        res.redirect('/planning/my-plans');
    }
};

exports.submitDailyPlan = async (req, res) => {
    try {
        const { planDate, firstClientCall, areasToVisit, itinerary, salesObjectives, targetCollections } = req.body;
        const planData = {
            user: req.user.id,
            planDate: new Date(planDate),
            firstClientCall,
            areasToVisit,
            itinerary: (itinerary || []).filter(item => item && item.trim() !== ''),
            salesObjectives: (salesObjectives || []).filter(o => o.objective && o.objective.trim() !== ''),
            targetCollections: {
                current: (targetCollections && targetCollections.current || []).filter(c => c.client && c.client.trim() !== ''),
                overdue: (targetCollections && targetCollections.overdue || []).filter(c => c.client && c.client.trim() !== '')
            }
        };
        await DailyPlan.findOneAndUpdate(
            { user: req.user.id, planDate: planData.planDate },
            planData,
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        );
        req.flash('success_msg', 'Daily plan saved successfully!');
        res.redirect('/planning/my-plans');
    } catch (err) {
        req.flash('error_msg', 'Failed to submit daily plan.');
        res.redirect('/planning/daily-plan-form');
    }
};

exports.addComment = async (req, res) => {
    try {
        const { planType, planId, text } = req.body;
        const comment = { user: req.user.id, text: text };
        const Model = planType === 'daily' ? DailyPlan : WeeklyItinerary;
        await Model.findByIdAndUpdate(planId, { $push: { comments: comment } });
        req.flash('success_msg', 'Comment added.');
        res.redirect(`/planning/view/${planType}/${planId}`);
    } catch (err) {
        req.flash('error_msg', 'Failed to add comment.');
        res.redirect('back');
    }
};

exports.getPlanningHistory = async (req, res) => {
    try {
        const dailyPlans = await DailyPlan.find().populate('user').sort({ planDate: -1 });
        const weeklyItineraries = await WeeklyItinerary.find().populate('user').sort({ weekStartDate: -1 });
        res.render('planning-history', { dailyPlans, weeklyItineraries });
    } catch (err) {
        req.flash('error_msg', 'Could not load planning history.');
        res.redirect('/admin-dashboard');
    }
};

exports.getWeeklyCoverageReport = async (req, res) => {
    try {
        const today = new Date();
        const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 1));
        const endOfWeek = new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000);

        const startDate = req.query.startDate ? new Date(req.query.startDate) : startOfWeek;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : endOfWeek;
        const userId = req.query.userId;

        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        const filter = { createdAt: { $gte: startDate, $lte: endDate } };
        if (userId) filter.user = userId;

        const users = await User.find({ role: { $in: ['MSR', 'KAS'] } }).sort({ firstName: 1 });
        const checkIns = await CheckIn.find(filter)
            .populate('user', 'firstName lastName')
            .populate('hospital', 'name')
            .populate('doctor', 'name')
            .sort({ user: 1, createdAt: 1 });

        const coverageData = checkIns.reduce((acc, checkIn) => {
            if (!checkIn.user) return acc;
            const userId = checkIn.user._id.toString();
            if (!acc[userId]) {
                acc[userId] = {
                    user: checkIn.user,
                    checkIns: []
                };
            }
            acc[userId].checkIns.push(checkIn);
            return acc;
        }, {});
        
        res.render('weekly-coverage-report', {
            coverageData: Object.values(coverageData),
            users,
            filters: {
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
                userId: userId || ''
            }
        });
    } catch (err) {
        console.error("Error generating weekly coverage report:", err);
        req.flash('error_msg', 'Could not generate the weekly coverage report.');
        res.redirect('/admin-dashboard');
    }
};

// NEW FUNCTION: To handle the CSV export for the weekly report.
exports.exportWeeklyCoverageReport = async (req, res) => {
    try {
        const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(0);
        const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
        const userId = req.query.userId;

        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        const filter = { createdAt: { $gte: startDate, $lte: endDate } };
        if (userId) filter.user = userId;

        const checkIns = await CheckIn.find(filter)
            .populate('user', 'firstName lastName')
            .populate('hospital', 'name')
            .populate('doctor', 'name')
            .sort({ createdAt: -1 });

        const fields = [
            { label: 'User', value: 'user' },
            { label: 'Date', value: 'date' },
            { label: 'Time', value: 'time' },
            { label: 'Hospital', value: 'hospital' },
            { label: 'Doctor', value: 'doctor' },
            { label: 'Activity', value: 'activity' }
        ];

        const data = checkIns.map(checkin => ({
            user: checkin.user ? `${checkin.user.firstName} ${checkin.user.lastName}` : 'N/A',
            date: new Date(checkin.createdAt).toLocaleDateString(),
            time: new Date(checkin.createdAt).toLocaleTimeString(),
            hospital: checkin.hospital ? checkin.hospital.name : 'N/A',
            doctor: checkin.doctor ? checkin.doctor.name : 'N/A',
            activity: checkin.activity || ''
        }));

        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(data);

        res.header('Content-Type', 'text/csv');
        res.attachment(`weekly-coverage-report-${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);

    } catch (err) {
        console.error("Error exporting weekly coverage report:", err);
        res.status(500).send("Error generating report");
    }
};
