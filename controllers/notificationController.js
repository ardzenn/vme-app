const Notification = require('../models/Notification');

exports.getNotificationsApi = async (req, res) => {
    try {
        const notifications = await Notification.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .limit(10);
        
        const unreadCount = await Notification.countDocuments({ user: req.user.id, read: false });

        res.json({ notifications, unreadCount });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch notifications.' });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { user: req.user.id, read: false },
            { $set: { read: true } }
        );
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'Failed to mark notifications as read.' });
    }
};