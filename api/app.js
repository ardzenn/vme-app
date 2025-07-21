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

// --- 3. HEALTH CHECK ROUTE (THIS IS THE FIX) ---
// This public route is used by Render to verify that the service is live.
app.get('/health', (req, res) => {
    // A simple 200 OK response is all that's needed.
    res.status(200).send('OK');
});

// --- 4. IMPORT ROUTE HANDLERS and MIDDLEWARE ---
const { router: authRoutes, authMiddleware } = require('../routes/auth');
const adminRoutes = require('../routes/admin');
const checkinRoutes = require('../routes/checkin');
const collectionRoutes = require('../routes/collection');
const dashboardRoutes = require('../routes/dashboard');
const orderRoutes = require('../routes/order')(io);
const profileRoutes = require('../routes/profile');

// --- 5. DATABASE CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connection established successfully.'))
  .catch(err => {
    console.error("CRITICAL: Failed to connect to MongoDB", err);
    process.exit(1);
  });

// --- 6. DEFINE ROUTES ---
app.use('/', authRoutes);
app.use('/admin', adminRoutes);
app.use('/checkin', checkinRoutes);
app.use('/collection', collectionRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/order', orderRoutes);
app.use('/profile', profileRoutes);

app.get('/', authMiddleware, (req, res) => res.redirect('/dashboard'));

// --- 7. SOCKET.IO EVENT HANDLERS ---
io.on('connection', (socket) => {
    // ... your existing socket.io logic ...
});

// --- 8. START THE SERVER ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`>>>>>> SERVER IS RUNNING ON PORT ${PORT} <<<<<<`);
});