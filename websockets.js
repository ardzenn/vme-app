const Message = require('./models/Message');
const Order = require('./models/Order');
const User = require('./models/User');
const Transaction = require('./models/Transaction');
const DirectMessage = require('./models/DirectMessage');

const connectedUsers = new Map();

function initializeWebsockets(io) {
    io.on('connection', (socket) => {
        console.log(`✅ WebSocket Connection Established: ${socket.id}`);

        // Get the userId from the initial handshake
        const userId = socket.handshake.query.userId;
        
        if (userId) {
            // Track the user as online
            connectedUsers.set(socket.id, userId);
            // Have the user join a private room named after their own ID for direct messages
            socket.join(userId);
            // Broadcast the new count of online users to everyone
            io.emit('onlineUsers', connectedUsers.size);
        }

        // --- Handler for Direct Messaging ---
        socket.on('sendDirectMessage', async ({ recipientId, text }) => {
            const senderId = connectedUsers.get(socket.id);
            if (!senderId || !recipientId || !text) return;

            try {
                const message = new DirectMessage({ sender: senderId, recipient: recipientId, text });
                await message.save();
                const populatedMessage = await DirectMessage.findById(message._id).populate('sender', 'firstName lastName profilePicture');

                // Send the message to both the recipient's and sender's private rooms
                io.to(recipientId).to(senderId).emit('newDirectMessage', populatedMessage);
            } catch (err) {
                console.error("Direct Message Error:", err);
            }
        });

        // --- Handler for Order-Specific Chat ---
        socket.on('joinOrderRoom', (orderId) => {
            socket.join(orderId);
            console.log(`Socket ${socket.id} joined order room: ${orderId}`);
        });

        socket.on('sendOrderMessage', async ({ orderId, userId, text, attachment }) => {
            if (!orderId || !userId || (!text && !attachment)) {
                return console.error('Invalid data for sendOrderMessage');
            }
            try {
                const message = new Message({ order: orderId, user: userId, text, attachment });
                await message.save();
                await Order.findByIdAndUpdate(orderId, { $push: { messages: message._id } });
                const populatedMessage = await Message.findById(message._id).populate('user', 'firstName lastName profilePicture');
                io.to(orderId).emit('newOrderMessage', populatedMessage);
            } catch (error) {
                console.error("Error saving or broadcasting order message:", error);
            }
        });

        // --- Handler for Transaction Comments ---
        socket.on('joinTransactionRoom', (transactionId) => {
            socket.join(transactionId);
            console.log(`Socket ${socket.id} joined transaction room: ${transactionId}`);
        });

        socket.on('sendTransactionComment', async ({ transactionId, userId, text, attachmentUrl }) => {
            if (!transactionId || !userId || (!text && !attachmentUrl)) {
                return console.error('Invalid data for sendTransactionComment');
            }
            try {
                const comment = { user: userId, text, attachmentUrl, createdAt: new Date() };
                const updatedTransaction = await Transaction.findByIdAndUpdate(
                    transactionId,
                    { $push: { comments: comment } },
                    { new: true }
                ).populate('comments.user', 'firstName lastName profilePicture');
                
                const newComment = updatedTransaction.comments[updatedTransaction.comments.length - 1];
                io.to(transactionId).emit('newTransactionComment', newComment);
            } catch (error) {
                console.error("Error saving or broadcasting transaction comment:", error);
            }
        });

        // --- Handler for Real-Time Location Updates ---
        socket.on('updateLocation', async ({ lat, lng }) => {
            const userId = socket.handshake.query.userId;
            if (!userId || !lat || !lng) return;
            try {
                await User.findByIdAndUpdate(userId, {
                    lastLocation: { type: 'Point', coordinates: [lng, lat] },
                    lastLocationUpdate: Date.now()
                });
                io.emit('locationUpdate', { userId, lat, lng });
            } catch (error) {
                console.error("Error updating user location:", error);
            }
        });

        // --- Handle Disconnect ---
        socket.on('disconnect', () => {
            if (connectedUsers.has(socket.id)) {
                connectedUsers.delete(socket.id);
                io.emit('onlineUsers', connectedUsers.size);
            }
            console.log(`🔌 WebSocket Disconnected: ${socket.id}`);
        });
    });
}

module.exports = initializeWebsockets;