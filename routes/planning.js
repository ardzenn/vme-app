const express = require('express');
const router = express.Router();
const planningController = require('../controllers/planningController');
const { ensureAuthenticated } = require('../middleware/auth');

// --- VIEWS ---
router.get('/my-plans', ensureAuthenticated, planningController.getMyPlans);
router.get('/my-weekly-itineraries', ensureAuthenticated, planningController.getMyWeeklyItineraries);
router.get('/daily-plan-form', ensureAuthenticated, planningController.getDailyPlanForm);
router.get('/daily-plan-form/:id', ensureAuthenticated, planningController.getDailyPlanForEdit);
router.get('/weekly-itinerary-form', ensureAuthenticated, planningController.getWeeklyItineraryForm);
router.get('/weekly-itinerary-form/:id', ensureAuthenticated, planningController.getWeeklyItineraryForEdit);
router.get('/history', ensureAuthenticated, planningController.getPlanningHistory);
router.get('/view/:type/:id', ensureAuthenticated, planningController.getPlanDetails);
router.get('/coverage-report', ensureAuthenticated, planningController.getWeeklyCoverageReport);

// --- ACTIONS (POST routes) ---
router.post('/daily', ensureAuthenticated, planningController.uploadDailyPlanAttachments, planningController.submitDailyPlan);
router.post('/daily/:id', ensureAuthenticated, planningController.uploadDailyPlanAttachments, planningController.updateDailyPlan);
router.post('/weekly', ensureAuthenticated, planningController.submitWeeklyItinerary);
router.post('/comment', ensureAuthenticated, planningController.addComment);
router.post('/view/daily/:id/read', ensureAuthenticated, planningController.markPlanAsRead);

// --- EXPORT ROUTE ---
router.get('/coverage-report/export', ensureAuthenticated, planningController.exportWeeklyCoverageReport);

module.exports = router;