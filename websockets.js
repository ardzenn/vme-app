const Conversation = require('./models/Conversation');
const Message = require('./models/Message');
const User = require('./models/User');
const Order = require('./models/Order');
const Transaction = require('./models/Transaction');

const connectedUsers = new Map();

function initializeWebsockets(io) {
    io.on('connection', (socket) => {
        const userId = socket.handshake.query.userId;
        // Get user's first name for typing indicator
        const userName = socket.handshake.query.userName; 

        if (userId) {
            connectedUsers.set(socket.id, { userId, userName });
            socket.join(userId); // Join a personal room for notifications
            io.emit('onlineUsers', connectedUsers.size);

            // Automatically join all of the user's existing conversation rooms on connect
            Conversation.find({ participants: userId }).then(convos => {
                convos.forEach(convo => socket.join(convo._id.toString()));
            });
        }

        // --- NEW CHAT SYSTEM HANDLERS ---
        socket.on('joinNewGroup', (conversationId) => {
            socket.join(conversationId);
        });

        socket.on('sendMessage', async ({ conversationId, text }) => {
            const senderData = connectedUsers.get(socket.id);
            if (!senderData || !conversationId || !text) return;

            try {
                const message = new Message({ conversation: conversationId, sender: senderData.userId, text });
                await message.save();

                // Also update the conversation's updatedAt timestamp for sorting
                await Conversation.findByIdAndUpdate(conversationId, { 
                    lastMessage: message._id,
                    updatedAt: Date.now() 
                });

                const populatedMessage = await Message.findById(message._id).populate('sender', 'firstName lastName profilePicture');
                io.to(conversationId).emit('newMessage', populatedMessage);
            } catch (err) {
                console.error("Send Message Error:", err);
            }
        });

        // --- NEW: HANDLERS FOR TYPING INDICATOR ---
        socket.on('startTyping', ({ conversationId }) => {
            const senderData = connectedUsers.get(socket.id);
            if (!senderData) return;
            
            // Broadcast to everyone in the room EXCEPT the sender
            socket.to(conversationId).emit('userTyping', { 
                conversationId, 
                sender: { id: senderData.userId, name: senderData.userName } 
            });
        });

        socket.on('stopTyping', ({ conversationId }) => {
            const senderData = connectedUsers.get(socket.id);
            if (!senderData) return;
            socket.to(conversationId).emit('userStoppedTyping', { 
                conversationId,
                senderId: senderData.userId
            });
        });


        // --- LEGACY CHAT & COMMENT HANDLERS (Unchanged) ---
        socket.on('joinOrderRoom', (orderId) => {
            socket.join(orderId);
        });

        socket.on('sendOrderMessage', async ({ orderId, userId, text, attachment }) => {
            try {
                const legacyMessage = new Message({ order: orderId, user: userId, text, attachment });
                await legacyMessage.save();
                await Order.findByIdAndUpdate(orderId, { $push: { messages: legacyMessage._id } });
                const populatedMessage = await Message.findById(legacyMessage._id).populate('user', 'firstName lastName profilePicture');
                io.to(orderId).emit('newOrderMessage', populatedMessage);
            } catch (error) {
                console.error("Error saving or broadcasting order message:", error);
            }
        });

        socket.on('joinTransactionRoom', (transactionId) => {
            socket.join(transactionId);
        });

        socket.on('sendTransactionComment', async ({ transactionId, userId, text, attachmentUrl }) => {
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


        // --- LOCATION & DISCONNECT HANDLERS (Unchanged) ---
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

        socket.on('disconnect', () => {
            if (connectedUsers.has(socket.id)) {
                connectedUsers.delete(socket.id);
                io.emit('onlineUsers', connectedUsers.size);
            }
        });
    });
}

module.exports = initializeWebsockets;
