require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');

const authRoutes = require('../routes/auth'); // Change to '../routes/auth'
const dashboardRoutes = require('../routes/dashboard'); // Change to '../routes/dashboard'
const checkinRoutes = require('../routes/checkin'); // Change to '../routes/checkin'
const orderRoutes = require('../routes/order'); // Change to '../routes/order'
const collectionRoutes = require('../routes/collection'); // Change to '../routes/collection'
const accountingRoutes = require('../routes/accounting'); // Change to '../routes/accounting'
const adminRoutes = require('../routes/admin'); // Change to '../routes/admin'

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Routes
app.use('/', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/checkin', checkinRoutes);
app.use('/order', orderRoutes);
app.use('/collection', collectionRoutes);
app.use('/accounting', accountingRoutes);
app.use('/admin', adminRoutes);

// Socket.io setup
const connectedUsers = {}; // Track user sockets by userId
io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    connectedUsers[userId] = socket.id;
  });

  // Real-time location update
  socket.on('updateLocation', async ({ userId, lat, lng }) => {
    const User = require('../models/User'); // Change to '../models/User'
    await User.findByIdAndUpdate(userId, { location: { lat, lng, timestamp: Date.now() } });
    io.emit('locationUpdate', { userId, lat, lng });
  });

  // Order chat
  socket.on('joinOrder', (orderId) => {
    socket.join(orderId);
  });
  socket.on('sendMessage', async ({ orderId, userId, text, attachment }) => {
    const Message = require('../models/Message'); // Change to '../models/Message'
    const newMsg = new Message({ order: orderId, user: userId, text, attachment });
    await newMsg.save();
    io.to(orderId).emit('newMessage', newMsg);
  });
});

server.listen(process.env.PORT, () => console.log(`Server running on port ${process.env.PORT}`));