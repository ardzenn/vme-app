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

// AUTH ROUTES (Login, Signup, etc.)
// ... (Your complete auth routes from the previous step are correct)

// DASHBOARD ROUTE
app.get('/dashboard', authMiddleware, async (req, res) => {
    // ... (Your complete dashboard logic is correct)
});

// CHECK-IN ROUTE
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

// ORDER BOOKING & DETAIL ROUTES
app.get('/order/book', authMiddleware, (req, res) => res.render('bookorder', { user: req.user }));

app.post('/order/book', authMiddleware, upload.single('attachment'), async (req, res) => {
    const { customerName, area, hospital, contactNumber, email, note, subtotal } = req.body;
    const products = [];
    let i = 0;
    while (req.body[`products[${i}][product]`]) {
        products.push({
            product: req.body[`products[${i}][product]`],
            quantity: parseFloat(req.body[`products[${i}][quantity]`]),
            price: parseFloat(req.body[`products[${i}][price]`]),
            total: parseFloat(req.body[`products[${i}][total]`])
        });
        i++;
    }
    const reference = `SALES-${Date.now().toString().slice(-6)}${new Date().getFullYear()}`;
    const attachment = req.file ? `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}` : null;
    const order = new Order({ user: req.user.id, customerName, area, hospital, contactNumber, email, note, products, subtotal: parseFloat(subtotal), attachment, reference });
    await order.save();
    res.redirect('/dashboard');
});

app.get('/order/:id', authMiddleware, async (req, res) => {
    // ... (Your order data logic for the modal is correct)
});

// COLLECTION ROUTES
app.get('/collection', authMiddleware, (req, res) => res.render('collection', { user: req.user }));
app.post('/collection', authMiddleware, upload.single('file'), async (req, res) => {
    const { type } = req.body;
    const file = req.file ? `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}` : null;
    const collection = new Collection({ user: req.user.id, type, file });
    await collection.save();
    res.redirect('/dashboard');
});

// ADMIN ROUTE
app.post('/admin/assign-role', authMiddleware, roleMiddleware(['Admin']), async (req, res) => {
    // ... (Your admin logic is correct)
});

// PROFILE ROUTE (Example - you may need to create a profile.ejs view)
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