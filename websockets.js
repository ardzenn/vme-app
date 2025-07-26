const Conversation = require('./models/Conversation');
const User = require('./models/User');

const onlineUsers = new Map();

function initializeWebsockets(io) {
    io.on('connection', (socket) => {
        const userId = socket.handshake.query.userId;
        const userName = socket.handshake.query.userName;

        if (userId) {
            onlineUsers.set(userId, {
                socketId: socket.id,
                _id: userId,
                userName: userName,
                lastLocation: null // Can be updated later
            });
            socket.join(userId);

            // Automatically join all of the user's existing general chat rooms on connect
            Conversation.find({ participants: userId }).then(convos => {
                convos.forEach(convo => socket.join(convo._id.toString()));
            });

            io.emit('updateUserList', Array.from(onlineUsers.values()));
        }

        // --- GENERAL CHAT HANDLERS ---
        socket.on('joinNewGroup', (conversationId) => {
            socket.join(conversationId);
        });

        socket.on('startTyping', ({ conversationId }) => {
            const senderData = Array.from(onlineUsers.values()).find(u => u.socketId === socket.id);
            if (!senderData) return;
            socket.to(conversationId).emit('userTyping', {
                conversationId,
                sender: { id: senderData._id, name: senderData.userName }
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


        // --- ORDER COMMUNICATION ROOM ---
        // This now correctly joins the room name used by the controller
        socket.on('joinOrderRoom', (orderId) => {
            socket.join(`order_${orderId}`);
        });


        // --- LOCATION & DISCONNECT HANDLERS ---
        socket.on('updateLocation', async (coords) => {
            if (userId && coords) {
                try {
                    const user = await User.findByIdAndUpdate(userId, {
                        lastLocation: { type: 'Point', coordinates: [coords.lng, coords.lat] },
                        lastLocationUpdate: Date.now()
                    }, { new: true }).select('firstName lastName role lastLocation');
                    
                    if (user) {
                        const onlineUser = onlineUsers.get(userId);
                        if (onlineUser) {
                            onlineUser.lastLocation = user.lastLocation;
                        }
                        io.emit('locationUpdate', user);
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