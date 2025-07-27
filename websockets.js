const Conversation = require('./models/Conversation');
const User = require('./models/User');

const onlineUsers = new Map();

function initializeWebsockets(io) {
    io.on('connection', async (socket) => {
        const userId = socket.handshake.query.userId;
        
        if (userId) {
            try {
                // When a user connects, fetch their data from the database, including lastLocation
                const user = await User.findById(userId).select('firstName lastName role lastLocation');
                if (user) {
                    onlineUsers.set(userId, {
                        socketId: socket.id,
                        _id: user._id,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        role: user.role,
                        lastLocation: user.lastLocation 
                    });
                }

                socket.join(userId);

                Conversation.find({ participants: userId }).then(convos => {
                    convos.forEach(convo => socket.join(convo._id.toString()));
                });

                // Broadcast the updated list of all online users to everyone
                io.emit('updateUserList', Array.from(onlineUsers.values()));
                
            } catch (err) {
                console.error("Error on user connection:", err);
            }
        }

        socket.on('joinNewGroup', (conversationId) => {
            socket.join(conversationId);
        });

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

        socket.on('joinOrderRoom', (orderId) => {
            socket.join(`order_${orderId}`);
        });

        socket.on('updateLocation', async (coords) => {
            if (userId && coords) {
                try {
                    const updatedUser = await User.findByIdAndUpdate(userId, {
                        lastLocation: { type: 'Point', coordinates: [coords.lng, coords.lat] },
                        lastLocationUpdate: Date.now()
                    }, { new: true }).select('firstName lastName role lastLocation');
                    
                    if (updatedUser) {
                        const onlineUser = onlineUsers.get(userId);
                        if (onlineUser) {
                            onlineUser.lastLocation = updatedUser.lastLocation;
                        }
                        io.emit('locationUpdate', updatedUser);
                    }
                } catch (error) {
                    console.error("Error updating user location:", error);
                }
            }
        });

        socket.on('disconnect', () => {
            if (userId) {
                onlineUsers.delete(userId);
                io.emit('updateUserList', Array.from(onlineUsers.values()));
            }
        });
    });
}

module.exports = initializeWebsockets;