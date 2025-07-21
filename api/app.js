// Load environment variables from .env file
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
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const multer = require('multer');
const session = require('express-session'); // NEW
const flash = require('connect-flash');     // NEW

// --- 1. INITIAL APP, SERVER, and SOCKET.IO SETUP ---
const app = express();
const server = http.createServer(app);
const io = socketIo(server);


// --- 2. MODELS ---
const User = require('../models/User');
const Order = require('../models/Order');
const CheckIn = require('../models/CheckIn');
const Hospital = require('../models/Hospital');
const Doctor = require('../models/Doctor');
const Message = require('../models/Message');
const Collection = require('../models/Collection');

// --- 3. VIEW ENGINE and MIDDLEWARE ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));
const upload = multer({ storage: multer.memoryStorage() });

// I PUT SESSION AND FLASH MIDDLEWARE HERE - ARDON
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));
app.use(flash());

// Middleware to make flash messages available to all templates
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error'); // For login errors
    next();
});


// --- 4. MIDDLEWARE FUNCTIONS ---
const authMiddleware = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) { return res.redirect('/login'); }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.redirect('/login');
    }
};

const roleMiddleware = (roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) { return res.redirect('/dashboard'); }
    next();
};

// --- 5. HEALTH CHECK ROUTE ---
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// --- 6. DATABASE CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connection established successfully.'))
  .catch(err => {
    console.error("CRITICAL: Failed to connect to MongoDB", err);
    process.exit(1);
  });

// --- 7. DEFINE ALL APPLICATION ROUTES ---
// ADMIN ROUTE I MADE ANOTHER ROUTE HERE - ARDON
app.post('/admin/assign-role', authMiddleware, roleMiddleware(['Admin']), async (req, res) => {
    try {
        const { userId, role } = req.body;
        await User.findByIdAndUpdate(userId, { role: role });
        
        // THIS IS THE FIX: Create a success flash message
        req.flash('success_msg', 'User role has been updated successfully!');
        
        res.redirect('/dashboard');
    } catch (err) {
        console.error('Error assigning role:', err);
        req.flash('error_msg', 'An error occurred while updating the role.');
        res.redirect('/dashboard'); 
    }
});


// ROOT ROUTE
app.get('/', authMiddleware, (req, res) => res.redirect('/dashboard'));

// AUTH ROUTES
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

app.get('/signup', (req, res) => res.render('signup', { error: null }));
app.post('/signup', async (req, res) => {
    try {
        const { username, password, firstName, lastName, birthdate, area, address } = req.body;
        const user = new User({ username, password, firstName, lastName, birthdate, area, address });
        await user.save();
        res.redirect('/login');
    } catch (err) {
        res.render('signup', { error: 'Error creating account. Email may be taken.' });
    }
});

app.get('/login', (req, res) => res.render('login', { error: null }));
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) { return res.render('login', { error: 'Invalid credentials' }); }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) { return res.render('login', { error: 'Invalid credentials' }); }
        const token = jwt.sign({ id: user._id, role: user.role, firstName: user.firstName }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
        res.redirect('/dashboard');
    } catch (err) {
        res.render('login', { error: 'An error occurred.' });
    }
});

app.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/login');
});

app.get('/forgot-password', (req, res) => res.render('forgot-password', { error: null, success: null }));
app.post('/forgot-password', async (req, res) => { /* ... password reset logic ... */ });
app.get('/reset-password/:token', async (req, res) => { /* ... password reset logic ... */ });
app.post('/reset-password/:token', async (req, res) => { /* ... password reset logic ... */ });



// DASHBOARD ROUTE
app.get('/dashboard', authMiddleware, async (req, res) => {
    try {
        const { id: userId, role: userRole } = req.user;
        if (userRole === 'Admin') {
            let [users, allCheckins, allOrders] = await Promise.all([
                User.find({}).sort({ username: 1 }),
                CheckIn.find({}).populate('user hospital doctor').sort({ 'location.timestamp': -1 }),
                Order.find({}).populate('user').sort({ timestamp: -1 })
            ]);
            allCheckins = allCheckins.filter(c => c.user && c.hospital && c.doctor);
            allOrders = allOrders.filter(o => o.user);
            const pendingUsers = users.filter(u => u.role === 'Pending').length;
            return res.render('admin-dashboard', {
                user: req.user, users, checkins: allCheckins, orders: allOrders,
                stats: { totalUsers: users.length, pendingUsers: pendingUsers, totalCheckins: allCheckins.length }
            });
        }
        // Add Accounting role logic here if it exists
        if (userRole === 'Accounting') {
             let [users, allCheckins, allOrders] = await Promise.all([
                User.find({}).sort({ username: 1 }),
                CheckIn.find({}).populate('user hospital doctor').sort({ 'location.timestamp': -1 }),
                Order.find({}).populate('user').sort({ timestamp: -1 })
            ]);
            allCheckins = allCheckins.filter(c => c.user && c.hospital && c.doctor);
            allOrders = allOrders.filter(o => o.user);
            return res.render('accounting-dashboard', {
                user: req.user, users, checkins: allCheckins, orders: allOrders
            });
        }
        // MSR / KAS logic
        let [orders, checkins] = await Promise.all([
            Order.find({ user: userId }).populate('user').sort({ timestamp: -1 }),
            CheckIn.find({ user: userId }).populate('user hospital doctor').sort({ 'location.timestamp': -1 })
        ]);
        checkins = checkins.filter(c => c.user && c.hospital && c.doctor);
        orders = orders.filter(o => o.user);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checkinsToday = checkins.filter(c => c.location.timestamp >= today).length;
        const pendingOrdersCount = orders.filter(o => o.status === 'Pending').length;
        const totalSales = orders.reduce((sum, order) => sum + order.subtotal, 0);
        res.render('dashboard', {
            user: req.user, checkins, orders,
            stats: {
                checkinsToday: checkinsToday, pendingOrders: pendingOrdersCount,
                totalSales: totalSales.toLocaleString('en-US', { style: 'currency', currency: 'PHP', currencyDisplay: 'code' }).replace('PHP', '₱')
            }
        });
    } catch (err) {
        console.error('Dashboard loading error:', err);
        res.status(500).send('Error loading dashboard');
    }
});

// CHECK-IN ROUTE
app.post('/checkin', authMiddleware, upload.single('proof'), async (req, res) => {
    const { hospitalName, doctorName, activity, lat, lng, signature, proof_base64 } = req.body;
    try {
        let hospital = await Hospital.findOne({ name: hospitalName, user: req.user.id });
        if (!hospital) { hospital = new Hospital({ name: hospitalName, user: req.user.id }); await hospital.save(); }
        let doctor = await Doctor.findOne({ name: doctorName, hospital: hospital._id, user: req.user.id });
        if (!doctor) { doctor = new Doctor({ name: doctorName, hospital: hospital._id, user: req.user.id }); await doctor.save(); }
        let proofData = null;
        if (req.file) { proofData = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`; }
        else if (proof_base64) { proofData = proof_base64; }
        const location = { lat: parseFloat(lat) || 0, lng: parseFloat(lng) || 0 };
        const checkin = new CheckIn({ user: req.user.id, hospital: hospital._id, doctor: doctor._id, proof: proofData, activity, signature, location });
        await checkin.save();
        res.redirect('/dashboard');
    } catch (err) {
        console.error('CheckIn error:', err);
        res.status(400).send(err.message);
    }
});

// ORDER ROUTES
app.get('/order/book', authMiddleware, (req, res) => res.render('bookorder', { user: req.user }));
app.post('/order/book', authMiddleware, upload.single('attachment'), async (req, res) => { /* ... order booking logic ... */ });
app.get('/order/:id', authMiddleware, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate('user');
        if (!order) { return res.status(404).json({ message: "Order not found" }); }
        const currentUser = await User.findById(req.user.id);
        const messages = await Message.find({ order: req.params.id }).sort({ createdAt: 'asc' }).populate('user', 'username profilePicture');
        res.json({ order, messages, currentUser });
    } catch (err) {
        res.status(500).json({ message: "Error loading order details." });
    }
});
app.post('/order/:id/update', authMiddleware, roleMiddleware(['Accounting']), async (req, res) => { /* ... order update logic ... */ });

// COLLECTION ROUTES
app.get('/collection', authMiddleware, (req, res) => res.render('collection', { user: req.user }));
app.post('/collection', authMiddleware, upload.single('file'), async (req, res) => { /* ... collection logic ... */ });

// ADMIN ROUTE
app.post('/admin/assign-role', authMiddleware, roleMiddleware(['Admin']), async (req, res) => { /* ... admin role logic ... */ });

// PROFILE ROUTE
app.get('/profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.render('profile', { user });
    } catch (err) {
        res.redirect('/dashboard');
    }
});

// --- 8. SOCKET.IO EVENT HANDLERS ---
io.on('connection', (socket) => {
    socket.on('joinOrder', (orderId) => socket.join(orderId));
    socket.on('sendMessage', async ({ orderId, userId, text }) => {
        try {
            if (!userId || !text) return;
            const newMsg = new Message({ order: orderId, user: userId, text: text });
            await newMsg.save();
            const populatedMsg = await Message.findById(newMsg._id).populate('user', 'username profilePicture');
            io.to(orderId).emit('newMessage', populatedMsg);
        } catch (error) {
            console.error("Error in sendMessage handler:", error);
        }
    });
    socket.on('updateLocation', async ({ userId, lat, lng }) => {
        await User.findByIdAndUpdate(userId, { location: { lat, lng, timestamp: Date.now() } });
        io.emit('locationUpdate', { userId, lat, lng });
    });
});

// --- 9. START THE SERVER ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`>>>>>> SERVER IS RUNNING ON PORT ${PORT} <<<<<<`);
});