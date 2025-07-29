const Conversation = require('./models/Conversation');
const User = require('./models/User');
const axios = require('axios'); // For making API requests to Mapbox

const onlineUsers = new Map();

function initializeWebsockets(io) {
    io.on('connection', async (socket) => {
        const userId = socket.handshake.query.userId;
        
        if (userId) {
            try {
                // Fetch user data, now including lastKnownAddress
                const user = await User.findById(userId).select('firstName lastName role lastLocation lastKnownAddress');
                if (user) {
                    onlineUsers.set(userId, {
                        socketId: socket.id,
                        _id: user._id,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        role: user.role,
                        lastLocation: user.lastLocation,
                        lastKnownAddress: user.lastKnownAddress
                    });
                }

                socket.join(userId);

                Conversation.find({ participants: userId }).then(convos => {
                    convos.forEach(convo => socket.join(convo._id.toString()));
                });

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

        // MODIFIED: This now performs reverse geocoding
        socket.on('updateLocation', async (coords) => {
            if (userId && coords) {
                try {
                    let address = 'Address lookup failed.';
                    const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;

                    // Step 1: Call Mapbox API to get the address from coordinates
                    if (mapboxToken) {
                        try {
                            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords.lng},${coords.lat}.json?access_token=${mapboxToken}&types=poi,address&limit=1`;
                            const response = await axios.get(url);
                            if (response.data && response.data.features && response.data.features.length > 0) {
                                address = response.data.features[0].place_name;
                            } else {
                                address = 'Near specified coordinates.';
                            }
                        } catch (apiError) {
                            console.error("Mapbox API Error:", apiError.message);
                            address = "Could not retrieve address."
                        }
                    } else {
                        address = "Mapbox token not configured."
                    }
                    
                    // Step 2: Update the user in the database with coordinates AND the new address
                    const updatedUser = await User.findByIdAndUpdate(userId, {
                        lastLocation: { type: 'Point', coordinates: [coords.lng, coords.lat] },
                        lastLocationUpdate: Date.now(),
                        lastKnownAddress: address
                    }, { new: true }).select('firstName lastName role lastLocation lastKnownAddress lastLocationUpdate');
                    
                    // Step 3: Broadcast the complete user object (with address) to all clients
                    if (updatedUser) {
                        const onlineUser = onlineUsers.get(userId);
                        if (onlineUser) {
                            onlineUser.lastLocation = updatedUser.lastLocation;
                            onlineUser.lastKnownAddress = updatedUser.lastKnownAddress;
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