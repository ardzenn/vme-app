const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { ensureAuthenticated, ensureAdmin } = require('../middleware/auth');

// --- User Management API Routes ---

// Route to approve a user
router.post('/users/:userId/approve', ensureAuthenticated, ensureAdmin, adminController.approveUser);

// Route to reject (and delete) a pending user
router.post('/users/:userId/reject', ensureAuthenticated, ensureAdmin, adminController.rejectUser);

// Route to update a user's role
router.put('/users/:userId/role', ensureAuthenticated, ensureAdmin, adminController.updateUserRole);

// Route to delete a user
router.delete('/users/:userId', ensureAuthenticated, ensureAdmin, adminController.deleteUser);


// --- Other Admin Routes ---

// POST route for sending a company-wide announcement
router.post('/announce', ensureAuthenticated, ensureAdmin, adminController.sendAnnouncement);


module.exports = router;