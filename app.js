// Load environment variables from .env file
require('dotenv').config();

// --- 1. CORE & NPM MODULES ---
const express = require('express');
const http = require('http');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const socketio = require('socket.io');

// --- 2. LOCAL IMPORTS ---
const dbConnect = require('./dbConnect');
const initializeWebsockets = require('./websockets');

// Pre-load all models
require('./models/User');
require('./models/Order');
require('./models/Message');
require('./models/DirectMessage');
require('./models/Hospital');
require('./models/Doctor');
require('./models/CheckIn');
require('./models/Collection');

const User = require('./models/User');

// --- 3. INITIALIZATION ---
dbConnect();
const app = express();
const server = http.createServer(app);
const io = socketio(server);

initializeWebsockets(io);

// --- 4. MIDDLEWARE ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- FIX: Serve static files (like images, css, js) BEFORE session and routes ---
// This is the crucial fix for the "Cannot GET /uploads/..." error.
app.use(express.static(path.join(__dirname, 'public')));

// View Engine Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session and Authentication Middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'a-very-secret-key-for-development',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    next();
});

// --- 5. ROUTING ---
const authRoutes = require('./routes/auth');
const viewRoutes = require('./routes/views');
const orderRoutes = require('./routes/orders');
const checkinRoutes = require('./routes/checkin');
const collectionRoutes = require('./routes/collection');
const apiRoutes = require('./routes/api');
const chatRoutes = require('./routes/chat');
const userRoutes = require('./routes/users');

app.use('/', authRoutes);
app.use('/', viewRoutes);
app.use('/orders', orderRoutes);
app.use('/checkin', checkinRoutes);
app.use('/collection', collectionRoutes);
app.use('/chat', chatRoutes);
app.use('/api', apiRoutes);
app.use('/users', userRoutes);

// --- 6. SERVER LISTENING ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
