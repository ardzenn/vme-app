require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const dbConnect = require('./dbConnect');

// --- Server and Socket.IO Setup ---
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// This object will hold our connected users
const connectedUsers = {};

// --- View Engine and Middleware ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// This structure ensures the DB connects before the server starts
(async () => {
  try {
    // 1. Wait for the database to connect
    await dbConnect();
    console.log('MongoDB connection established successfully.');

    // 2. Import routes **after** DB connection
    const authRoutes = require('../routes/auth');
    const dashboardRoutes = require('../routes/dashboard');
    const checkinRoutes = require('../routes/checkin');
    const orderRoutes = require('../routes/order')(io);
    const collectionRoutes = require('../routes/collection');
    const accountingRoutes = require('../routes/accounting');
    const adminRoutes = require('../routes/admin');
    const profileRoutes = require('../routes/profile');
    const chatRoutes = require('../routes/chat');
    
    // 3. Use the routes
    app.use('/', authRoutes);
    app.use('/dashboard', dashboardRoutes);
    app.use('/checkin', checkinRoutes);
    app.use('/order', orderRoutes);
    app.use('/collection', collectionRoutes);
    app.use('/accounting', accountingRoutes);
    app.use('/admin', adminRoutes);
    app.use('/profile', profileRoutes);
    app.use('/chat', chatRoutes);

    // Redirect root URL to the login page
    app.get('/', (req, res) => {
      res.redirect('/login');
    });

    // --- Socket.IO Event Handlers ---
    io.on('connection', (socket) => {
      const userId = socket.handshake.query.userId;
      if (userId) {
        console.log(`A user connected: ${userId} with socket ID: ${socket.id}`);
        connectedUsers[userId] = socket.id;
      }

      // Listener for the Order-specific chat
      socket.on('sendMessage', async ({ orderId, userId, text }) => {
        const Message = require('../models/Message');
        try {
          if (!userId || !text) return; 
          const newMsg = new Message({ order: orderId, user: userId, text: text });
          await newMsg.save();
          const populatedMsg = await Message.findById(newMsg._id).populate('user', 'username');
          io.to(orderId).emit('newMessage', populatedMsg);
        } catch (error) {
          console.error("Error in sendMessage handler:", error);
        }
      });

      // Listener for the new Messenger-style chat
      socket.on('sendDirectMessage', async ({ recipientId, text }) => {
        const senderId = userId;
        if (!senderId || !recipientId || !text) return;
        try {
          const DirectMessage = require('../models/DirectMessage');
          const newMessage = new DirectMessage({ sender: senderId, recipient: recipientId, text });
          await newMessage.save();
          const populatedMessage = await DirectMessage.findById(newMessage._id).populate('sender', 'username profilePicture');
          
          const recipientSocketId = connectedUsers[recipientId];
          if (recipientSocketId) {
            io.to(recipientSocketId).emit('newDirectMessage', populatedMessage);
          }
          socket.emit('newDirectMessage', populatedMessage);
        } catch (error) {
          console.error('Error sending direct message:', error);
        }
      });

      socket.on('disconnect', () => {
        if (userId) {
          console.log(`User ${userId} disconnected.`);
          delete connectedUsers[userId];
        }
      });
    });

    // 4. Start the server
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`>>>>>> SERVER IS RUNNING ON PORT ${PORT} <<<<<<`);
    });

  } catch (err) {
    console.error("Failed to start the server", err);
    process.exit(1);
  }
})();