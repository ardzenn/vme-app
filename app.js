// Load environment variables from .env file
const MongoStore = require('connect-mongo');

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

// Pre-load all models to prevent schema errors
require('./models/User');
require('./models/Order');
require('./models/Message');
// ... require all your other models here

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

// Serve static files (images, css, client-side js)
app.use(express.static(path.join(__dirname, 'public')));

// View Engine Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session and Authentication Middleware (Order is important!)
app.use(session({
    secret: process.env.SESSION_SECRET || 'a-very-secret-key-for-development',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));
app.use(flash());

// Passport JS MUST be initialized AFTER the session middleware
app.use(passport.initialize());
app.use(passport.session());

// Configure Passport to use the User model
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Global variables for all templates
app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error'); // For passport login errors
    next();
});

// --- 5. ROUTING ---
const authRoutes = require('./routes/auth');
const viewRoutes = require('./routes/views');
const orderRoutes = require('./routes/orders');
// ... require all your other route files

// Health Check Route for deployment
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.use('/', authRoutes);
app.use('/', viewRoutes);
app.use('/orders', orderRoutes);
// ... app.use for all your other routes

// --- 6. SERVER LISTENING ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
