const User = require('../models/User');
const { createNotificationsForGroup } = require('../services/notificationService');

exports.sendAnnouncement = async (req, res) => {
    try {
        const { message } = req.body;
        if (!message || message.trim() === "") {
            req.flash('error_msg', 'Announcement message cannot be empty.');
            return res.redirect('/admin-dashboard');
        }

        // Fetch all user IDs
        const allUsers = await User.find({}).select('_id');
        const allUserIds = allUsers.map(user => user._id);

        const io = req.app.get('io');
        const notificationText = `Announcement: ${message}`;
        const notificationLink = '/feed'; // Link to the feed to see any related discussion

        // Use our existing service to create a notification for every single user
        await createNotificationsForGroup(io, allUserIds, notificationText, notificationLink);

        req.flash('success_msg', 'Your announcement has been broadcast to all users.');
        res.redirect('/admin-dashboard');

    } catch (err) {
        console.error("Error sending announcement:", err);
        req.flash('error_msg', 'An error occurred while sending the announcement.');
        res.redirect('/admin-dashboard');
    }
};