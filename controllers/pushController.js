// in controllers/pushController.js
const webpush = require('web-push');
const User = require('../models/User');

webpush.setVapidDetails(
  'mailto:your-email@example.com', // Replace with your email
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

exports.sendNotificationToAdmins = async (payload) => {
    try {
        const admins = await User.find({ role: { $in: ['Admin', 'Accounting'] } });
        admins.forEach(admin => {
            if (admin.pushSubscription) {
                webpush.sendNotification(admin.pushSubscription, JSON.stringify(payload))
                    .catch(err => console.error('Error sending notification:', err));
            }
        });
    } catch (err) {
        console.error('Could not send notifications:', err);
    }
};