const Notification = require('../models/Notification');
const User = require('../models/User');

// Helper function to get all Admin and IT user IDs
async function getAdminAndITIds() {
    try {
        const users = await User.find({ role: { $in: ['Admin', 'IT'] } }).select('_id');
        return users.map(u => u._id);
    } catch (error) {
        console.error('Error fetching admin/IT user IDs:', error);
        return [];
    }
}

// Helper function to get all finance-related user IDs
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

async function createNotification(io, recipient, text, link) {
    try {
        if (!recipient || !text || !link) {
            throw new Error('Recipient, text, and link are required.');
        }

        const notification = new Notification({
            user: recipient,
            text,
            link
        });
        await notification.save();

        // Emit to the user's specific room
        io.to(recipient.toString()).emit('new_notification', notification);
    } catch (error) {
        console.error('Error creating notification:', error);
    }
}

// A new function to create notifications for a group of users
async function createNotificationsForGroup(io, userIds, text, link) {
    if (!Array.isArray(userIds)) return;
    // Create all notifications in parallel for efficiency
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