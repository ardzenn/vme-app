const User = require('../models/User');
const { createNotificationsForGroup } = require('../services/notificationService');

// Approve a pending user and assign a role
exports.approveUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;

        if (!role) {
            return res.status(400).json({ success: false, message: 'Role is required.' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        user.role = role;
        await user.save();

        res.json({ success: true, message: 'User approved successfully.' });
    } catch (error) {
        console.error('Error approving user:', error);
        res.status(500).json({ success: false, message: 'Server error while approving user.' });
    }
};

// Reject (delete) a pending user
exports.rejectUser = async (req, res) => {
    try {
        const { userId } = req.params;
        await User.findByIdAndDelete(userId);
        res.json({ success: true, message: 'User rejected successfully.' });
    } catch (error) {
        console.error('Error rejecting user:', error);
        res.status(500).json({ success: false, message: 'Server error while rejecting user.' });
    }
};

// Update an existing user's role
exports.updateUserRole = async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;

        if (!role) {
            return res.status(400).json({ success: false, message: 'Role is required.' });
        }

        await User.findByIdAndUpdate(userId, { role });
        res.json({ success: true, message: 'User role updated successfully.' });
    } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({ success: false, message: 'Server error while updating role.' });
    }
};

// Delete a user permanently
exports.deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        await User.findByIdAndDelete(userId);
        res.json({ success: true, message: 'User deleted successfully.' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ success: false, message: 'Server error while deleting user.' });
    }
};


// This is your existing function for announcements
exports.sendAnnouncement = async (req, res) => {
    try {
        const { message } = req.body;
        if (!message || message.trim() === "") {
            req.flash('error_msg', 'Announcement message cannot be empty.');
            return res.redirect('/admin-dashboard#users-panel');
        }

        const allUsers = await User.find({}).select('_id');
        const allUserIds = allUsers.map(user => user._id);

        const io = req.app.get('io');
        const notificationText = `Announcement: ${message}`;
        const notificationLink = '/feed';

        await createNotificationsForGroup(io, {
            recipients: allUserIds,
            sender: req.user.id,
            type: 'ANNOUNCEMENT',
            message: notificationText,
            link: notificationLink
        });

        req.flash('success_msg', 'Your announcement has been broadcast to all users.');
        res.redirect('/admin-dashboard#users-panel');

    } catch (err) {
        console.error("Error sending announcement:", err);
        req.flash('error_msg', 'An error occurred while sending the announcement.');
        res.redirect('/admin-dashboard#users-panel');
    }
};