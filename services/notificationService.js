const Notification = require('../models/Notification');
const User = require('../models/User');
// Import the new push notification function
const { sendPushNotification } = require('../controllers/pushController');

async function getAdminAndITIds() {
    try {
        const users = await User.find({ role: { $in: ['Admin', 'IT'] } }).select('_id');
        return users.map(u => u._id);
    } catch (error) {
        console.error('Error fetching admin/IT user IDs:', error);
        return [];
    }
}

async function getFinanceAndAdminIds() {
    try {
        const users = await User.find({ 
            role: { $in: ['Accounting', 'Sales Manager', 'Inventory', 'Admin', 'IT'] } 
        }).select('_id');
        return users.map(u => u._id);
    } catch (error) {
        console.error('Error fetching finance/admin user IDs:', error);
        return [];
    }
}

async function createNotification(io, recipientId, text, link) {
    try {
        if (!recipientId || !text || !link) {
            throw new Error('Recipient, text, and link are required.');
        }

        // 1. Save the in-app notification to the database
        const notification = new Notification({
            user: recipientId,
            text,
            link
        });
        await notification.save();

        // 2. Emit a real-time event to update the user's "bell" icon if they are online
        io.to(recipientId.toString()).emit('new_notification', notification);

        // 3. Send a push notification to the user's home screen if they are subscribed
        const payload = {
            title: 'VME App Notification',
            body: text,
            url: link
        };
        await sendPushNotification(recipientId, payload);

    } catch (error) {
        console.error('Error creating notification:', error);
    }
}

async function createNotificationsForGroup(io, userIds, text, link) {
    if (!Array.isArray(userIds)) return;
    // This will now create both an in-app and a push notification for each user in the group.
    await Promise.all(
        userIds.map(userId => createNotification(io, userId, text, link))
    );
}

module.exports = { 
    createNotification,
    createNotificationsForGroup,
    getAdminAndITIds,
    getFinanceAndAdminIds
};