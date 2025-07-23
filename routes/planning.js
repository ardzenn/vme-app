// in routes/planning.js
const express = require('express');
const router = express.Router();
const planningController = require('../controllers/planningController');
const { ensureAuthenticated } = require('../middleware/auth'); // Assuming you have middleware
// In routes/planning.js
router.get('/daily/:id', ensureAuthenticated, planningController.getPlanDetails);
router.get('/weekly/:id', ensureAuthenticated, planningController.getPlanDetails);
router.get('/my-plans', ensureAuthenticated, planningController.getMyPlans);

// User-facing forms
router.get('/daily', ensureAuthenticated, planningController.getDailyPlanForm);
router.post('/daily', ensureAuthenticated, planningController.submitDailyPlan);
router.get('/weekly', ensureAuthenticated, planningController.getWeeklyItineraryForm);
router.post('/weekly', ensureAuthenticated, planningController.submitWeeklyItinerary);

// Management views
router.get('/history', ensureAuthenticated, planningController.getPlanningHistory);
router.get('/coverage-report', ensureAuthenticated, planningController.getWeeklyCoverageReport);

// Commenting
router.post('/comment', ensureAuthenticated, planningController.addComment);

module.exports = router;