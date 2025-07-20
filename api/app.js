require('dotenv').config();
const dbConnect = require('./dbConnect');
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');

const authRoutes = require('../routes/auth');
const dashboardRoutes = require('../routes/dashboard');
const checkinRoutes = require('../routes/checkin');
const orderRoutes = require('../routes/order');
const collectionRoutes = require('../routes/collection');
const accountingRoutes = require('../routes/accounting');
const adminRoutes = require('../routes/admin');
const profileRoutes = require('../routes/profile');


const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views')); // Adjusted to find views from api folder
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public'))); // Serve static files from root public
app.use('/uploads', express.static(path.join(__dirname, '../uploads'))); // Serve uploads from root

// Multer setup (memory storage for Vercel)
const upload = multer({ storage: multer.memoryStorage() });

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 30000, // 30 seconds for server selection
  socketTimeoutMS: 45000, // 45 seconds for socket timeout
  connectTimeoutMS: 30000, // 30 seconds for connection
  bufferCommands: false // Disable buffering to prevent timeout on queued operations
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));
dbConnect().then(() => {
  console.log('MongoDB connection established successfully.');
});
// Routes
app.use('/', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/checkin', checkinRoutes);
app.use('/order', orderRoutes);
app.use('/collection', collectionRoutes);
app.use('/accounting', accountingRoutes);
app.use('/admin', adminRoutes);
app.use('/profile', profileRoutes);

// Root redirect
app.get('/', (req, res) => res.redirect('/login'));

// Socket.io setup
const connectedUsers = {};
io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    connectedUsers[userId] = socket.id;
  });

  socket.on('updateLocation', async ({ userId, lat, lng }) => {
    const User = require('../models/User');
    await User.findByIdAndUpdate(userId, { location: { lat, lng, timestamp: Date.now() } });
    io.emit('locationUpdate', { userId, lat, lng });
  });

  socket.on('joinOrder', (orderId) => {
    socket.join(orderId);
  });
  socket.on('sendMessage', async ({ orderId, userId, text, attachment }) => {
    const Message = require('../models/Message');
    const newMsg = new Message({ order: orderId, user: userId, text, attachment });
    await newMsg.save();
    io.to(orderId).emit('newMessage', newMsg);
  });
});

app.get('/', (req, res) => res.redirect('/login')); 
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});