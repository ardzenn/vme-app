// Enhanced websockets.js - Update your existing websockets.js

const Conversation = require('./models/Conversation');
const User = require('./models/User');
const Message = require('./models/Message');
const { createNotificationsForGroup } = require('./services/notificationService');

const onlineUsers = new Map();

function initializeWebsockets(io) {
    io.on('connection', async (socket) => {
        console.log('User connected:', socket.id);
        
        const userId = socket.handshake.query.userId;
        
        if (userId) {
            try {
                const user = await User.findById(userId).select('firstName lastName role lastLocation lastKnownAddress profilePicture');
                if (user) {
                    // Store user with enhanced information
                    onlineUsers.set(userId, {
                        socketId: socket.id,
                        _id: user._id,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        role: user.role,
                        lastLocation: user.lastLocation,
                        lastKnownAddress: user.lastKnownAddress,
                        profilePicture: user.profilePicture,
                        connectedAt: new Date()
                    });

                    // Join personal room for notifications
                    socket.join(userId);

                    // Join conversation rooms
                    const conversations = await Conversation.find({ participants: userId });
                    conversations.forEach(convo => socket.join(convo._id.toString()));

                    // Emit updated online user list to all connected clients
                    io.emit('updateUserList', Array.from(onlineUsers.values()));
                    
                    console.log(`${user.firstName} ${user.lastName} (${user.role}) is now online`);
                }
            } catch (err) {
                console.error("Error on user connection:", err);
            }
        }

        // Handle personal room joining
        socket.on('joinPersonalRoom', (userId) => {
            socket.join(userId);
        });

        // Handle conversation joining
        socket.on('joinNewGroup', (conversationId) => {
            socket.join(conversationId);
        });

        // Handle typing indicators
        socket.on('startTyping', ({ conversationId }) => {
            const senderData = Array.from(onlineUsers.values()).find(u => u.socketId === socket.id);
            if (!senderData) return;
            socket.to(conversationId).emit('userTyping', {
                conversationId,
                sender: { id: senderData._id, name: senderData.firstName }
            });
        });

        socket.on('stopTyping', ({ conversationId }) => {
            const senderData = Array.from(onlineUsers.values()).find(u => u.socketId === socket.id);
            if (!senderData) return;
            socket.to(conversationId).emit('userStoppedTyping', {
                conversationId,
                senderId: senderData._id
            });
        });

        // Handle order room joining
        socket.on('joinOrderRoom', (orderId) => {
            socket.join(`order_${orderId}`);
        });

        // Handle location updates
        socket.on('locationUpdate', async (locationData) => {
            const userData = Array.from(onlineUsers.values()).find(u => u.socketId === socket.id);
            if (!userData) return;

            try {
                // Update user location in database
                await User.findByIdAndUpdate(userData._id, {
                    lastLocation: locationData.coords,
                    lastKnownAddress: locationData.address,
                    lastLocationUpdate: new Date()
                });

                // Update in-memory data
                const userInMap = onlineUsers.get(userData._id.toString());
                if (userInMap) {
                    userInMap.lastLocation = locationData.coords;
                    userInMap.lastKnownAddress = locationData.address;
                    onlineUsers.set(userData._id.toString(), userInMap);
                }

                // Emit updated user list
                io.emit('updateUserList', Array.from(onlineUsers.values()));
            } catch (error) {
                console.error('Error updating user location:', error);
            }
        });

        // Handle requests for user list
        socket.on('requestUserList', () => {
            socket.emit('updateUserList', Array.from(onlineUsers.values()));
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            
            // Find and remove the disconnected user
            let disconnectedUser = null;
            for (const [userId, userData] of onlineUsers.entries()) {
                if (userData.socketId === socket.id) {
                    disconnectedUser = userData;
                    onlineUsers.delete(userId);
                    break;
                }
            }

            if (disconnectedUser) {
                console.log(`${disconnectedUser.firstName} ${disconnectedUser.lastName} is now offline`);
            }

            // Emit updated online user list
            io.emit('updateUserList', Array.from(onlineUsers.values()));
        });

        // Handle admin broadcasts
        socket.on('adminBroadcast', async (data) => {
            const senderData = Array.from(onlineUsers.values()).find(u => u.socketId === socket.id);
            if (!senderData || !['Admin', 'IT'].includes(senderData.role)) return;

            try {
                const allUsers = await User.find({ role: { $ne: 'Pending' } }).select('_id');
                const recipients = allUsers.map(u => u._id);

                await createNotificationsForGroup(io, {
                    recipients,
                    sender: senderData._id,
                    type: 'ANNOUNCEMENT',
                    message: data.message,
                    link: '/dashboard'
                });

                // Also emit real-time broadcast
                io.emit('adminBroadcast', {
                    message: data.message,
                    sender: `${senderData.firstName} ${senderData.lastName}`,
                    timestamp: new Date()
                });
            } catch (error) {
                console.error('Error broadcasting message:', error);
            }
        });
    });

    // Periodic cleanup of stale connections
    setInterval(() => {
        const now = new Date();
        const staleThreshold = 5 * 60 * 1000; // 5 minutes

        for (const [userId, userData] of onlineUsers.entries()) {
            if (now - userData.connectedAt > staleThreshold) {
                // Check if socket is still connected
                const socket = io.sockets.sockets.get(userData.socketId);
                if (!socket || !socket.connected) {
                    console.log(`Cleaning up stale connection for user ${userData.firstName}`);
                    onlineUsers.delete(userId);
                }
            }
        }

        // Emit updated list after cleanup
        io.emit('updateUserList', Array.from(onlineUsers.values()));
    }, 60000); // Run every minute
}

module.exports = initializeWebsockets;