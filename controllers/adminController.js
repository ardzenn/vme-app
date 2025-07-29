const User = require('../models/User');
const { createNotificationsForGroup } = require('../services/notificationService');

exports.sendAnnouncement = async (req, res) => {
    try {
        const { message } = req.body;
        if (!message || message.trim() === "") {
            req.flash('error_msg', 'Announcement message cannot be empty.');
            return res.redirect('/admin-dashboard');
        }

        const allUsers = await User.find({}).select('_id');
        const allUserIds = allUsers.map(user => user._id);

        const io = req.app.get('io');
        const notificationText = `Announcement: ${message}`;
        const notificationLink = '/feed';

        // FIXED: The function now passes a single object with named properties
        await createNotificationsForGroup(io, {
            recipients: allUserIds,
            sender: req.user.id,
            type: 'ANNOUNCEMENT',
            message: notificationText,
            link: notificationLink
        });

        req.flash('success_msg', 'Your announcement has been broadcast to all users.');
        res.redirect('/admin-dashboard');

    } catch (err) {
        console.error("Error sending announcement:", err);
        req.flash('error_msg', 'An error occurred while sending the announcement.');
        res.redirect('/admin-dashboard');
    }
};