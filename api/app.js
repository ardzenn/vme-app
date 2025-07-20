require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const checkinRoutes = require('./routes/checkin');
const orderRoutes = require('./routes/order');
const collectionRoutes = require('./routes/collection');
const accountingRoutes = require('./routes/accounting');
const adminRoutes = require('./routes/admin');
const profileRoutes = require('./routes/profile');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public')); // Serve static files (e.g., PWA manifest, icons)
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

// Default route for testing
app.get('/', (req, res) => res.redirect('/dashboard'));

// Routes
app.use('/', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/checkin', checkinRoutes);
app.use('/order', orderRoutes);
app.use('/collection', collectionRoutes);
app.use('/accounting', accountingRoutes);
app.use('/admin', adminRoutes);
app.use('/profile', profileRoutes);

// Socket.io
const connectedUsers = {};
io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    connectedUsers[userId] = socket.id;
  });

  socket.on('updateLocation', async ({ userId, lat, lng }) => {
    const User = require('./models/User');
    await User.findByIdAndUpdate(userId, { location: { lat, lng, timestamp: Date.now() } });
    io.emit('locationUpdate', { userId, lat, lng });
  });

  socket.on('joinOrder', (orderId) => {
    socket.join(orderId);
  });
  socket.on('sendMessage', async ({ orderId, userId, text, attachment }) => {
    const Message = require('./models/Message');
    const newMsg = new Message({ order: orderId, user: userId, text, attachment });
    await newMsg.save();
    io.to(orderId).emit('newMessage', newMsg);
  });
});

server.listen(process.env.PORT || 3000, () => console.log(`Server running on port ${process.env.PORT || 3000}`));