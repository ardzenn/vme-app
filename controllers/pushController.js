// in controllers/pushController.js
const webpush = require('web-push');
const User = require('../models/User');

webpush.setVapidDetails(
  `mailto:${process.env.ADMIN_EMAIL || 'your-email@example.com'}`,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

exports.subscribe = async (req, res) => {
    try {
        const subscription = req.body;
        await User.findByIdAndUpdate(req.user.id, { pushSubscription: subscription });
        res.status(201).json({ message: 'Subscription saved.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to save subscription.' });
    }
};

// NEW: A flexible function to send a push notification to a single user
exports.sendPushNotification = async (userId, payload) => {
    try {
        const user = await User.findById(userId);
        if (user && user.pushSubscription) {
            webpush.sendNotification(user.pushSubscription, JSON.stringify(payload))
                .catch(err => {
                    // If a subscription is expired or invalid (410/404), remove it from the database.
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        console.log(`Subscription for user ${userId} has expired. Removing.`);
                        User.findByIdAndUpdate(userId, { $unset: { pushSubscription: "" } }).exec();
                    } else {
                        console.error(`Error sending push notification to user ${userId}:`, err.message);
                    }
                });
        }
    } catch (err) {
        console.error('Could not send push notification:', err);
    }
};

// This function now uses the new, more flexible function
exports.sendNotificationToAdmins = async (payload) => {
    try {
        const admins = await User.find({ role: { $in: ['Admin', 'Accounting', 'IT'] } });
        admins.forEach(admin => {
            // Re-use our new function for each admin
            exports.sendPushNotification(admin._id, payload);
        });
    } catch (err) {
        console.error('Could not send notifications to admins:', err);
    }
};