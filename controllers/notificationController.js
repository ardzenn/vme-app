const Notification = require('../models/Notification');

exports.getNotificationsApi = async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user.id })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('sender', 'firstName lastName profilePicture');
        
        const unreadCount = await Notification.countDocuments({ recipient: req.user.id, isRead: false });

        res.json({ notifications, unreadCount });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch notifications.' });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user.id, isRead: false },
            { $set: { isRead: true } }
        );
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'Failed to mark notifications as read.' });
    }
};