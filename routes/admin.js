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

router.post('/users/:id/approve', ensureAuthenticated, ensureAdmin, async (req, res) => {
    try {
        const { role } = req.body;
        const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Send notification to approved user
        const io = req.app.get('io');
        const { createNotification } = require('../services/notificationService');
        
        await createNotification(io, {
            recipient: user._id,
            sender: req.user._id,
            type: 'ANNOUNCEMENT',
            message: `Welcome to VME App! Your account has been approved as ${role}.`,
            link: '/dashboard'
        });

        res.json({ success: true, message: 'User approved successfully' });
    } catch (error) {
        console.error('Error approving user:', error);
        res.status(500).json({ success: false, message: 'Error approving user' });
    }
});

router.post('/users/:id/reject', ensureAuthenticated, ensureAdmin, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'User rejected and removed' });
    } catch (error) {
        console.error('Error rejecting user:', error);
        res.status(500).json({ success: false, message: 'Error rejecting user' });
    }
});

router.put('/users/:id/role', ensureAuthenticated, ensureAdmin, async (req, res) => {
    try {
        const { role } = req.body;
        const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, message: 'User role updated successfully' });
    } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({ success: false, message: 'Error updating user role' });
    }
});

router.delete('/users/:id', ensureAuthenticated, ensureAdmin, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ success: false, message: 'Error deleting user' });
    }
});


module.exports = router;