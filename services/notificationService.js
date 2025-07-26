const Notification = require('../models/Notification');

async function createNotification(io, userId, text, link) {
    try {
        if (!userId || !text || !link) {
            throw new Error('User ID, text, and link are required to create a notification.');
        }

        const notification = new Notification({
            user: userId,
            text,
            link
        });
        await notification.save();

        io.to(userId.toString()).emit('new_notification', notification);
    } catch (error) {
        console.error('Error creating notification:', error);
    }
}

module.exports = { createNotification };