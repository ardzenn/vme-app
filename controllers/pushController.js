// controllers/pushController.js
// This handles push notifications on the server side
// controllers/pushController.js
const webpush = require('web-push');
const User = require('../models/User');

// Configure web-push with VAPID details
webpush.setVapidDetails(
  `mailto:${process.env.ADMIN_EMAIL || 'your-email@example.com'}`,
  process.env.VAPID_PUBLIC_KEY || 'BOx_pjFO7MNmFE1HyoXGbdGwPZixbbrFtA5dIAL2K1cdwjGJU0k7buGeKOgDuQasuhamK174AoV_ROq_nTi2bPo',
  process.env.VAPID_PRIVATE_KEY || 'kFF-gXdEeudYzLOX1Wsjd1wLcGKqNHEUm9xKee9dbi0'
);

exports.subscribe = async (req, res) => {
    try {
        const subscription = req.body;
        console.log('Saving subscription for user:', req.user.id);
        
        await User.findByIdAndUpdate(req.user.id, { pushSubscription: subscription });
        
        res.status(201).json({ 
            success: true,
            message: 'Subscription saved.' 
        });
    } catch (err) {
        console.error('Subscribe error:', err);
        res.status(500).json({ 
            success: false,
            message: 'Failed to save subscription.',
            error: err.message 
        });
    }
};

// Flexible function to send a push notification to a single user
exports.sendPushNotification = async (userId, payload) => {
    try {
        console.log(`Attempting to send push to user ${userId}`);
        
        const user = await User.findById(userId);
        
        if (!user) {
            console.log(`User ${userId} not found`);
            return false;
        }
        
        if (!user.pushSubscription) {
            console.log(`User ${userId} has no push subscription`);
            return false;
        }
        
        console.log('Sending push with payload:', payload);
        
        await webpush.sendNotification(user.pushSubscription, JSON.stringify(payload));
        console.log(`Push notification sent successfully to user ${userId}`);
        return true;
        
    } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
            console.log(`Subscription for user ${userId} has expired. Removing.`);
            await User.findByIdAndUpdate(userId, { $unset: { pushSubscription: "" } });
        } else {
            console.error(`Error sending push notification to user ${userId}:`, err);
        }
        return false;
    }
};

// Send notifications to admins
exports.sendNotificationToAdmins = async (payload) => {
    try {
        const admins = await User.find({ role: { $in: ['Admin', 'Accounting', 'IT'] } });
        
        const results = await Promise.all(
            admins.map(admin => exports.sendPushNotification(admin._id, payload))
        );
        
        const successCount = results.filter(r => r).length;
        console.log(`Sent push to ${successCount}/${admins.length} admins`);
        
    } catch (err) {
        console.error('Could not send notifications to admins:', err);
    }
};
// Send push to multiple users
exports.sendPushToMultiple = async (userIds, payload) => {
    const results = await Promise.allSettled(
        userIds.map(userId => exports.sendPushNotification(userId, payload))
    );
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
    console.log(`Push sent to ${successful}/${userIds.length} users`);
    
    return { successful, total: userIds.length };
};

// Test push notification
exports.testPush = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const success = await exports.sendPushNotification(userId, {
            title: 'Test Notification',
            body: 'This is a test push notification from VME App!',
            url: '/dashboard'
        });

        if (success) {
            res.json({ success: true, message: 'Test push sent successfully' });
        } else {
            res.status(400).json({ success: false, message: 'No push subscription found' });
        }
    } catch (error) {
        console.error('Test push error:', error);
        res.status(500).json({ success: false, error: 'Failed to send test push' });
    }
};

// Unsubscribe from push
exports.unsubscribe = async (req, res) => {
    try {
        const userId = req.user.id;
        
        await User.findByIdAndUpdate(userId, {
            pushSubscription: null,
            pushEnabled: false
        });

        res.json({ success: true, message: 'Unsubscribed from push notifications' });
    } catch (error) {
        console.error('Unsubscribe error:', error);
        res.status(500).json({ success: false, error: 'Failed to unsubscribe' });
    }
};