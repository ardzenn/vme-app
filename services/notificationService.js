const Notification = require('../models/Notification');
const User = require('../models/User');
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

async function createNotification(io, { recipient, sender, type, message, link }) {
    try {
        if (!recipient || !type || !message || !link) {
            throw new Error('Recipient, type, message, and link are required.');
        }

        const notification = new Notification({
            recipient,
            sender,
            type,
            message,
            link,
        });
        await notification.save();
        
        const populatedNotification = await Notification.findById(notification._id).populate('sender', 'firstName profilePicture');

        io.to(recipient.toString()).emit('new_notification', populatedNotification);

        const payload = {
            title: 'VME App Notification',
            body: message,
            url: link
        };
        await sendPushNotification(recipient, payload);

    } catch (error) {
        console.error('Error creating notification:', error);
    }
}

async function createNotificationsForGroup(io, { recipients, sender, type, message, link }) {
    if (!Array.isArray(recipients)) return;
    const uniqueRecipients = [...new Set(recipients.map(r => r.toString()))];
    
    await Promise.all(
        uniqueRecipients.map(recipientId => createNotification(io, { recipient: recipientId, sender, type, message, link }))
    );
}

module.exports = { 
    createNotification,
    createNotificationsForGroup,
    getAdminAndITIds,
    getFinanceAndAdminIds
};