// in controllers/planningController.js
const DailyPlan = require('../models/DailyPlan');
const WeeklyItinerary = require('../models/WeeklyItinerary');
const DailyReport = require('../models/DailyReport');

// --- Daily Call Plan ---
exports.getDailyPlanForm = (req, res) => {
    res.render('daily-plan-form');
};

exports.submitDailyPlan = async (req, res) => {
    try {
        const {
            planDate,
            firstClientCall,
            areasToVisit,
            placesToVisit,
            salesObjectives,
            targetCollections
        } = req.body;

        const newPlan = new DailyPlan({
            user: req.user.id,
            planDate,
            firstClientCall,
            areasToVisit,
            placesToVisit: placesToVisit || [],
            salesObjectives: salesObjectives || [],
            targetCollections: {
                current: targetCollections.current || [],
                overdue: targetCollections.overdue || []
            }
        });

        await newPlan.save();
        req.flash('success_msg', 'Daily Call Plan submitted successfully!');
        res.redirect('/dashboard');
    } catch (err) {
        console.error("Error submitting daily plan:", err);
        req.flash('error_msg', 'Failed to submit plan. A plan for this date may already exist.');
        res.redirect('/planning/daily');
    }
};

// --- Weekly Itinerary ---
exports.getWeeklyItineraryForm = (req, res) => {
    res.render('weekly-itinerary-form');
};

exports.submitWeeklyItinerary = async (req, res) => {
    try {
        const { dailyPlans } = req.body;
        
        // Calculate totals from the submitted form data
        let totalTargetSales = 0;
        let totalTargetCollections = 0;
        if (dailyPlans) {
            dailyPlans.forEach(plan => {
                (plan.salesObjectives || []).forEach(obj => totalTargetSales += parseFloat(obj.amount) || 0);
                (plan.collectionObjectives || []).forEach(obj => totalTargetCollections += parseFloat(obj.amount) || 0);
            });
        }
        
        // Find the Monday of the week for consistency
        const firstDate = new Date(dailyPlans[0].date);
        const dayOfWeek = firstDate.getDay();
        const diff = firstDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust when day is Sunday
        const weekStartDate = new Date(firstDate.setDate(diff));

        const newItinerary = new WeeklyItinerary({
            user: req.user.id,
            weekStartDate,
            dailyPlans: dailyPlans || [],
            totalTargetSales,
            totalTargetCollections
        });
        
        await newItinerary.save();
        req.flash('success_msg', 'Weekly Itinerary submitted successfully!');
        res.redirect('/dashboard');
    } catch (err) {
        console.error("Error submitting weekly itinerary:", err);
        req.flash('error_msg', 'Failed to submit itinerary. An itinerary for this week may already exist.');
        res.redirect('/planning/weekly');
    }
};

// --- Management Views ---
exports.getPlanningHistory = async (req, res) => {
    try {
        const dailyPlans = await DailyPlan.find().populate('user', 'firstName lastName').sort({ planDate: -1 });
        const weeklyItineraries = await WeeklyItinerary.find().populate('user', 'firstName lastName').sort({ weekStartDate: -1 });
        res.render('planning-history', { dailyPlans, weeklyItineraries });
    } catch (err) {
        console.error("Error getting planning history:", err);
        req.flash('error_msg', 'Could not load planning history.');
        res.redirect('/admin-dashboard');
    }
};

exports.getWeeklyCoverageReport = async (req, res) => {
    // This is a complex feature for the future, placeholder for now.
    res.send("Weekly Coverage Report Page - Coming Soon!");
};

// --- Commenting ---
exports.addComment = async (req, res) => {
    try {
        const { planType, planId, text } = req.body;
        const comment = { user: req.user.id, text: text };
        
        let planModel = planType === 'daily' ? DailyPlan : WeeklyItinerary;
        
        await planModel.findByIdAndUpdate(planId, { $push: { comments: comment } });

        res.redirect('back');
    } catch (err) {
        console.error("Error adding comment:", err);
        req.flash('error_msg', 'Could not post comment.');
        res.redirect('back');
    }
};

exports.getPlanDetails = async (req, res) => {
    try {
        let plan;
        let planType = req.path.includes('/daily/') ? 'daily' : 'weekly';

        if (planType === 'daily') {
            plan = await DailyPlan.findById(req.params.id).populate('user').populate('comments.user');
        } else {
            plan = await WeeklyItinerary.findById(req.params.id).populate('user').populate('comments.user');
        }

        if (!plan) {
            req.flash('error_msg', 'Plan not found.');
            return res.redirect('/planning/history');
        }

        res.render('planning-detail', { plan, planType });
    } catch (err) {
        console.error("Error getting plan details:", err);
        req.flash('error_msg', 'Could not load the plan details.');
        res.redirect('/planning/history');
    }
};
exports.getMyPlans = async (req, res) => {
    try {
        const dailyPlans = await DailyPlan.find({ user: req.user.id }).sort({ planDate: -1 });
        const weeklyItineraries = await WeeklyItinerary.find({ user: req.user.id }).sort({ weekStartDate: -1 });
        res.render('my-plans', { dailyPlans, weeklyItineraries });
    } catch (err) {
        console.error("Error getting user's plans:", err);
        req.flash('error_msg', 'Could not load your plan history.');
        res.redirect('/dashboard');
    }
};