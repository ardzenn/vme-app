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

// ROOT ROUTE
app.get('/', authMiddleware, (req, res) => res.redirect('/dashboard'));

// --- AUTH ROUTES (Login, Signup, Password Reset, etc.) ---
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

app.get('/forgot-password', (req, res) => {
    res.render('forgot-password', { error: null, success: null });
});
app.post('/forgot-password', async (req, res) => {
    try {
        const { username } = req.body;
        const user = await User.findOne({ username });
        if (!user) { return res.render('forgot-password', { error: 'No account with that email address exists.', success: null }); }
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
        res.render('forgot-password', { error: null, success: 'An email has been sent with further instructions.' });
    } catch (err) {
        res.render('forgot-password', { error: 'An error occurred sending the email.', success: null });
    }
});

app.get('/reset-password/:token', async (req, res) => {
    try {
        const user = await User.findOne({ passwordResetToken: req.params.token, passwordResetExpires: { $gt: Date.now() } });
        if (!user) { return res.render('forgot-password', { error: 'Password reset token is invalid or has expired.', success: null }); }
        res.render('reset-password', { token: req.params.token, error: null });
    } catch (err) {
        res.render('forgot-password', { error: 'An error occurred.', success: null });
    }
});
app.post('/reset-password/:token', async (req, res) => {
    try {
        const user = await User.findOne({ passwordResetToken: req.params.token, passwordResetExpires: { $gt: Date.now() } });
        if (!user) { return res.render('forgot-password', { error: 'Password reset token is invalid or has expired.', success: null }); }
        if (req.body.password !== req.body.confirmPassword) { return res.render('reset-password', { token: req.params.token, error: 'Passwords do not match.' }); }
        user.password = req.body.password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();
        res.redirect('/login');
    } catch (err) {
        res.render('forgot-password', { error: 'An error occurred while resetting the password.', success: null });
    }
});

// DASHBOARD ROUTE
app.get('/dashboard', authMiddleware, async (req, res) => {
    // ... (Your complete dashboard logic)
});

// CHECK-IN ROUTE (Corrected)
app.post('/checkin', authMiddleware, upload.single('proof'), async (req, res) => {
    const { hospitalName, doctorName, activity, lat, lng, signature, proof_base64 } = req.body;
    try {
        let hospital = await Hospital.findOne({ name: hospitalName, user: req.user.id });
        if (!hospital) {
            hospital = new Hospital({ name: hospitalName, user: req.user.id });
            await hospital.save();
        }
        let doctor = await Doctor.findOne({ name: doctorName, hospital: hospital._id, user: req.user.id });
        if (!doctor) {
            doctor = new Doctor({ name: doctorName, hospital: hospital._id, user: req.user.id });
            await doctor.save();
        }
        let proofData = null;
        if (req.file) {
            proofData = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        } else if (proof_base64) {
            proofData = proof_base64;
        }
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
app.post('/order/book', authMiddleware, upload.single('attachment'), async (req, res) => {
    // ... (Your complete order booking logic)
});
app.get('/order/:id', authMiddleware, async (req, res) => {
    // ... (Your order modal data logic)
});
app.post('/order/:id/update', authMiddleware, roleMiddleware(['Accounting']), async (req, res) => {
    // ... (Your order update logic)
});


// COLLECTION ROUTES
app.get('/collection', authMiddleware, (req, res) => res.render('collection', { user: req.user }));
app.post('/collection', authMiddleware, upload.single('file'), async (req, res) => {
    // ... (Your collection logic)
});

// ADMIN ROUTE
app.post('/admin/assign-role', authMiddleware, roleMiddleware(['Admin']), async (req, res) => {
    // ... (Your admin logic)
});

// PROFILE ROUTE
app.get('/profile', authMiddleware, async (req, res) => {
    const user = await User.findById(req.user.id);
    res.render('profile', { user });
});

// --- 8. SOCKET.IO EVENT HANDLERS ---
io.on('connection', (socket) => {
    // ... (Your socket.io logic)
});

// --- 9. START THE SERVER ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`>>>>>> SERVER IS RUNNING ON PORT ${PORT} <<<<<<`);
});