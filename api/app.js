// Load environment variables
require('dotenv').config();

// Core Node Modules
const path = require('path');
const http = require('http');

// NPM Packages
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const socketIo = require('socket.io');

// --- 1. INITIAL APP, SERVER, and SOCKET.IO SETUP ---
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// --- 2. VIEW ENGINE and MIDDLEWARE ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public'))); // Serve static files like CSS

// --- 3. IMPORT ROUTE HANDLERS and MIDDLEWARE ---
// Note: We import the router and middleware from auth.js separately for clarity
const { router: authRoutes, authMiddleware, roleMiddleware } = require('../routes/auth');
const adminRoutes = require('../routes/admin');
const checkinRoutes = require('../routes/checkin');
const collectionRoutes = require('../routes/collection');
const dashboardRoutes = require('../routes/dashboard');
const orderRoutes = require('../routes/order')(io); // Pass io to order routes
const profileRoutes = require('../routes/profile');

// --- 4. DATABASE CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connection established successfully.'))
  .catch(err => {
    console.error("CRITICAL: Failed to connect to MongoDB", err);
    process.exit(1); // Exit if the database connection fails
  });

// --- 5. DEFINE ROUTES ---
app.use('/', authRoutes); // Includes login, signup, logout, password reset
app.use('/admin', adminRoutes);
app.use('/checkin', checkinRoutes);
app.use('/collection', collectionRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/order', orderRoutes);
app.use('/profile', profileRoutes);

// Root redirect for logged-in users
app.get('/', authMiddleware, (req, res) => res.redirect('/dashboard'));

// --- 6. SOCKET.IO EVENT HANDLERS ---
const connectedUsers = {};
io.on('connection', (socket) => {
    // ... your existing socket.io logic for location updates and chat ...
});

// --- 7. START THE SERVER ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`>>>>>> SERVER IS RUNNING ON PORT ${PORT} <<<<<<`);
});