const Message = require('./models/Message');
const Order = require('./models/Order');
const User = require('./models/User');
const Transaction = require('./models/Transaction');

// This map will store the socket ID and the corresponding user ID
const connectedUsers = new Map();

function initializeWebsockets(io) {
    io.on('connection', (socket) => {
        console.log(`✅ WebSocket Connection Established: ${socket.id}`);

        const userId = socket.handshake.query.userId;
        if (userId) {
            // Track the user as online
            connectedUsers.set(socket.id, userId);
            // Broadcast the new count of online users to everyone
            io.emit('onlineUsers', connectedUsers.size);
        }

        // --- Handler for Order-Specific Chat ---
        socket.on('joinOrderRoom', (orderId) => {
            socket.join(orderId);
            console.log(`Socket ${socket.id} joined order room: ${orderId}`);
        });

        socket.on('sendOrderMessage', async ({ orderId, userId, text, attachment }) => {
            if (!orderId || !userId || (!text && !attachment)) {
                return console.error('Invalid data for sendOrderMessage:', { orderId, userId, text, attachment });
            }
            try {
                // 1. Create the new message object
                const messageData = { 
                    order: orderId, 
                    user: userId, 
                    text: text,
                    attachment: attachment // Add the attachment URL if it exists
                };

                const message = new Message(messageData);
                await message.save();

                // 2. Add the message reference to the order's message array
                await Order.findByIdAndUpdate(orderId, { $push: { messages: message._id } });

                // 3. Populate user details for display on the client
                const populatedMessage = await Message.findById(message._id).populate('user', 'firstName lastName profilePicture');

                // 4. Broadcast the new message to everyone in the order room
                io.to(orderId).emit('newOrderMessage', populatedMessage);

            } catch (error) {
                console.error("Error saving or broadcasting order message:", error);
            }
        });

        // Handler for Transac Comments
         socket.on('joinTransactionRoom', (transactionId) => {
            socket.join(transactionId);
            console.log(`Socket ${socket.id} joined transaction room: ${transactionId}`);
        });

        socket.on('sendTransactionComment', async ({ transactionId, userId, text, attachmentUrl }) => {
            if (!transactionId || !userId || (!text && !attachmentUrl)) {
                return console.error('Invalid data for sendTransactionComment');
            }
            try {
                const comment = { user: userId, text, attachmentUrl };
                const updatedTransaction = await Transaction.findByIdAndUpdate(
                    transactionId,
                    { $push: { comments: comment } },
                    { new: true }
                ).populate('comments.user', 'firstName lastName profilePicture');
                
                const newComment = updatedTransaction.comments[updatedTransaction.comments.length - 1];

                // Broadcast the new comment to everyone in the room
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
                    lastLocation: {
                        type: 'Point',
                        coordinates: [lng, lat]
                    },
                    lastLocationUpdate: Date.now()
                });
                io.emit('locationUpdate', { userId, lat, lng });
            } catch (error) {
                console.error("Error updating user location:", error);
            }
        });

        // --- Handle Disconnect ---
        socket.on('disconnect', () => {
            // When a user disconnects, remove them from the online list and update the count
            if (connectedUsers.has(socket.id)) {
                connectedUsers.delete(socket.id);
                io.emit('onlineUsers', connectedUsers.size);
            }
            console.log(`🔌 WebSocket Disconnected: ${socket.id}`);
        });
    });
}



module.exports = initializeWebsockets;
