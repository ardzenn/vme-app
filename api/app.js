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
const session = require('express-session');
const flash = require('connect-flash');

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
// Correctly set the path for the 'views' directory by going up one level
const viewsPath = path.join(__dirname, '..', 'views');
app.set('views', viewsPath);
app.set('view engine', 'ejs');

// --- ❗ ADDED FOR DEBUGGING ❗ ---
console.log(`✅ Views directory is set to: ${app.get('views')}`);
// --- ❗ END DEBUGGING ❗ ---

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
// Correctly set the path for the 'public' directory for static files
app.use(express.static(path.join(__dirname, '..', 'public')));
const upload = multer({ storage: multer.memoryStorage() });

// --- 4. SESSION & FLASH MIDDLEWARE ---
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));
app.use(flash());

// Middleware to make flash messages and user available to all templates
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.user || null;
    next();
});

// --- 5. CUSTOM MIDDLEWARE FUNCTIONS (Defined Before Routes) ---
const authMiddleware = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) { return res.redirect('/login'); }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.clearCookie('token');
        return res.redirect('/login');
    }
};

const roleMiddleware = (roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        req.flash('error_msg', 'You are not authorized to view this page.');
        return res.redirect('/dashboard');
    }
    next();
};

const checkApprovalMiddleware = (req, res, next) => {
    if (req.user && req.user.role === 'Pending') {
        return res.render('pending');
    }
    next();
};

// --- 6. HEALTH CHECK ROUTE ---
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// --- 7. DATABASE CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connection established successfully.'))
  .catch(err => {
    console.error("CRITICAL: Failed to connect to MongoDB", err);
    process.exit(1);
  });

// --- 8. DEFINE ALL APPLICATION ROUTES ---

// ROOT ROUTE
app.get('/', authMiddleware, checkApprovalMiddleware, (req, res) => res.redirect('/dashboard'));

// AUTH ROUTES
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

app.get('/signup', (req, res) => res.render('signup'));
app.post('/signup', async (req, res) => {
    try {
        const { username, password, firstName, lastName, birthdate, area, address } = req.body;
        const user = new User({ username, password, firstName, lastName, birthdate, area, address });
        await user.save();
        req.flash('success_msg', 'You are now registered and can log in.');
        res.redirect('/login');
    } catch (err) {
        req.flash('error', 'Error creating account. Email may be taken.');
        res.redirect('/signup');
    }
});

app.get('/login', (req, res) => res.render('login'));
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) {
            req.flash('error', 'Invalid credentials');
            return res.redirect('/login');
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            req.flash('error', 'Invalid credentials');
            return res.redirect('/login');
        }

        // ✅ **FIX**: Create a simple, flat payload for the token.
        const tokenPayload = { 
            id: user._id, 
            role: user.role, 
            firstName: user.firstName 
        };

        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
        res.redirect('/dashboard');
    } catch (err) {
        req.flash('error', 'An error occurred during login.');
        res.redirect('/login');
    }
});

app.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/login');
});

app.get('/forgot-password', (req, res) => res.render('forgot-password'));
app.post('/forgot-password', async (req, res) => {
    try {
        const { username } = req.body;
        const user = await User.findOne({ username });
        if (!user) {
            req.flash('error_msg', 'No account with that email address exists.');
            return res.redirect('/forgot-password');
        }
        const token = crypto.randomBytes(20).toString('hex');
        user.passwordResetToken = token;
        user.passwordResetExpires = Date.now() + 3600000; // 1 hour
        await user.save();
        const resetURL = `${req.protocol}://${req.get('host')}/reset-password/${token}`;
        await transporter.sendMail({
            to: user.username, from: `VME App <${process.env.EMAIL_USER}>`,
            subject: 'VME App Password Reset',
            text: `Please click the following link to reset your password:\n\n${resetURL}`
        });
        req.flash('success_msg', 'An email has been sent with further instructions.');
        res.redirect('/forgot-password');
    } catch (err) {
        req.flash('error_msg', 'An error occurred sending the email.');
        res.redirect('/forgot-password');
    }
});

app.get('/reset-password/:token', async (req, res) => {
    try {
        const user = await User.findOne({ passwordResetToken: req.params.token, passwordResetExpires: { $gt: Date.now() } });
        if (!user) {
            req.flash('error_msg', 'Password reset token is invalid or has expired.');
            return res.redirect('/forgot-password');
        }
        res.render('reset-password', { token: req.params.token });
    } catch (err) {
        req.flash('error_msg', 'An error occurred.');
        res.redirect('/forgot-password');
    }
});

app.post('/reset-password/:token', async (req, res) => {
    try {
        const user = await User.findOne({ passwordResetToken: req.params.token, passwordResetExpires: { $gt: Date.now() } });
        if (!user) {
            req.flash('error_msg', 'Password reset token is invalid or has expired.');
            return res.redirect('/forgot-password');
        }
        if (req.body.password !== req.body.confirmPassword) {
            req.flash('error', 'Passwords do not match.');
            return res.redirect(`/reset-password/${req.params.token}`);
        }
        user.password = req.body.password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();
        req.flash('success_msg', 'Password has been updated! Please log in.');
        res.redirect('/login');
    } catch (err) {
        req.flash('error_msg', 'An error occurred while resetting the password.');
        res.redirect('/forgot-password');
    }
});

// DASHBOARD ROUTE
app.get('/dashboard', authMiddleware, checkApprovalMiddleware, async (req, res) => {
    try {
        const { id: userId, role: userRole } = req.user;
        const loggedInUser = await User.findById(userId); // Get full user object

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
                user: loggedInUser, users, checkins: allCheckins, orders: allOrders,
                stats: { totalUsers: users.length, pendingUsers: pendingUsers, totalCheckins: allCheckins.length }
            });
        }
        
        if (userRole === 'Accounting') {
            let [users, allCheckins, allOrders] = await Promise.all([
                User.find({ role: { $in: ['MSR', 'KAS'] } }).sort({ username: 1 }),
                CheckIn.find({}).populate('user hospital doctor').sort({ 'location.timestamp': -1 }),
                Order.find({}).populate('user').sort({ timestamp: -1 })
            ]);
            allCheckins = allCheckins.filter(c => c.user && c.hospital && c.doctor);
            allOrders = allOrders.filter(o => o.user);
            return res.render('accounting-dashboard', {
                user: loggedInUser, users, checkins: allCheckins, orders: allOrders
            });
        }
        
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
            user: loggedInUser, checkins, orders,
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
app.post('/checkin', authMiddleware, checkApprovalMiddleware, upload.single('proof'), async (req, res) => {
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
        req.flash('success_msg', 'Check-in submitted successfully!');
        res.redirect('/dashboard');
    } catch (err) {
        console.error('CheckIn error:', err);
        req.flash('error_msg', 'Failed to submit check-in.');
        res.redirect('/dashboard');
    }
});

// ORDER ROUTES
app.get('/order/book', authMiddleware, checkApprovalMiddleware, (req, res) => res.render('bookorder'));
app.post('/order/book', authMiddleware, checkApprovalMiddleware, upload.single('attachment'), async (req, res) => {
    try {
        const { customerName, area, hospital, contactNumber, email, note, subtotal } = req.body;
        const products = [];
        if (req.body.products) {
            for (let i = 0; i < req.body.products.length; i++) {
                products.push({
                    product: req.body.products[i].product,
                    quantity: parseFloat(req.body.products[i].quantity),
                    price: parseFloat(req.body.products[i].price),
                    total: parseFloat(req.body.products[i].total)
                });
            }
        }
        const reference = `SALES-${Date.now().toString().slice(-6)}${new Date().getFullYear()}`;
        const attachment = req.file ? `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}` : null;
        const order = new Order({ user: req.user.id, customerName, area, hospital, contactNumber, email, note, products, subtotal: parseFloat(subtotal), attachment, reference });
        await order.save();
        req.flash('success_msg', 'Order booked successfully!');
        res.redirect('/dashboard');
    } catch (err) {
        console.error('Order booking error:', err);
        req.flash('error_msg', 'Failed to book order.');
        res.redirect('/dashboard');
    }
});
// In api/app.js

app.get('/order/:id', authMiddleware, checkApprovalMiddleware, async (req, res) => {
    try {
        // This now correctly finds the ID directly from the corrected token.
        const userId = req.user ? req.user.id : null;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized: User ID not in token." });
        }

        const order = await Order.findById(req.params.id).populate('user');
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        const currentUser = await User.findById(userId);
        if (!currentUser) {
            return res.status(403).json({ message: "Forbidden: User no longer exists" });
        }

        const messages = await Message.find({ order: req.params.id }).sort({ createdAt: 'asc' }).populate('user', 'username profilePicture');
        
        res.json({ order, messages, currentUser });

    } catch (err) {
        console.error("❌ Error in /order/:id route:", err); 
        res.status(500).json({ message: "Internal server error." });
    }
});

app.post('/order/:id/update', authMiddleware, checkApprovalMiddleware, roleMiddleware(['Accounting']), async (req, res) => {
    try {
        const { status, paymentStatus } = req.body;
        const products = req.body.products || [];
        let newSubtotal = 0;
        const updatedProducts = products.map(p => {
            const quantity = parseFloat(p.quantity) || 0;
            const price = parseFloat(p.price) || 0;
            const total = quantity * price;
            newSubtotal += total;
            return { product: p.product, quantity, price, total };
        });
        await Order.findByIdAndUpdate(req.params.id, {
            status, paymentStatus, products: updatedProducts, subtotal: newSubtotal
        });
        req.flash('success_msg', 'Order has been updated successfully!');
        res.redirect('/dashboard');
    } catch (err) {
        req.flash('error_msg', 'Error updating order.');
        res.redirect('/dashboard');
    }
});

// COLLECTION ROUTES
app.get('/collection', authMiddleware, checkApprovalMiddleware, (req, res) => res.render('collection'));
app.post('/collection', authMiddleware, checkApprovalMiddleware, upload.single('file'), async (req, res) => {
    try {
        const { type } = req.body;
        const file = req.file ? `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}` : null;
        if (!file) {
            req.flash('error_msg', 'Please upload a file.');
            return res.redirect('/collection');
        }
        const collection = new Collection({ user: req.user.id, type, file });
        await collection.save();
        req.flash('success_msg', 'Collection submitted successfully!');
        res.redirect('/dashboard');
    } catch (err) {
        req.flash('error_msg', 'Failed to submit collection.');
        res.redirect('/dashboard');
    }
});

// ADMIN ROUTE
app.post('/admin/assign-role', authMiddleware, roleMiddleware(['Admin']), async (req, res) => {
    try {
        const { userId, role } = req.body;
        await User.findByIdAndUpdate(userId, { role: role });
        req.flash('success_msg', 'User role has been updated successfully!');
        res.redirect('/dashboard');
    } catch (err) {
        req.flash('error_msg', 'An error occurred while updating the role.');
        res.redirect('/dashboard'); 
    }
});

// PROFILE ROUTE
app.get('/profile', authMiddleware, checkApprovalMiddleware, async (req, res) => {
    const user = await User.findById(req.user.id);
    res.render('profile', { user });
});

app.post('/profile', authMiddleware, upload.single('profilePicture'), async (req, res) => {
    try {
        if (!req.file) {
            req.flash('error_msg', 'Please select a file to upload.');
            return res.redirect('/profile');
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            req.flash('error_msg', 'User not found.');
            return res.redirect('/profile');
        }

        const profilePictureBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

        user.profilePicture = profilePictureBase64;
        await user.save();

        req.flash('success_msg', 'Profile picture updated successfully!');
        res.redirect('/profile');

    } catch (err) {
        console.error("Error updating profile picture:", err);
        req.flash('error_msg', 'An error occurred while updating your profile.');
        res.redirect('/profile');
    }
});

// --- 9. SOCKET.IO EVENT HANDLERS ---
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

// --- 10. START THE SERVER ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`>>>>>> SERVER IS RUNNING ON PORT ${PORT} <<<<<<`);
});