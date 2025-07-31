// routes/push.js
const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const pushController = require('../controllers/pushController');

// Status check endpoint (this one is already working for you)
router.get('/status', ensureAuthenticated, (req, res) => {
    res.json({ 
        status: 'Push routes are working',
        user: req.user ? req.user.id : 'no user'
    });
});

// Subscribe endpoint - THIS IS WHAT'S MISSING
router.post('/subscribe', ensureAuthenticated, pushController.subscribe);

// Test push endpoint - THIS IS ALSO MISSING
router.post('/test', ensureAuthenticated, async (req, res) => {
    try {
        console.log('Test push requested by user:', req.user.id);
        
        const success = await pushController.sendPushNotification(req.user.id, {
            title: 'Test Notification 🎉',
            body: 'This is a test push notification from VME App!',
            icon: '/images/icons/icon-192x192.png',
            badge: '/images/icons/icon-192x192.png',
            url: '/dashboard',
            tag: 'test-notification',
            requireInteraction: true,
            vibrate: [200, 100, 200]
        });
        
        if (success) {
            res.json({ 
                success: true, 
                message: 'Test push notification sent!' 
            });
        } else {
            res.status(400).json({ 
                success: false, 
                message: 'No push subscription found for user. Please refresh and allow notifications.' 
            });
        }
    } catch (error) {
        console.error('Test push error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

module.exports = router;