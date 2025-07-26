// in app.js

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
const MongoStore = require('connect-mongo');

// --- 2. LOCAL IMPORTS ---
const dbConnect = require('./dbConnect');
const initializeWebsockets = require('./websockets');

// --- Create upload directories ---
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
// ... other directory creations can remain if you need them

// --- Pre-load all models to prevent schema errors ---
require('./models/User');
require('./models/Order');
require('./models/Message');
require('./models/Hospital');
require('./models/Doctor');
require('./models/CheckIn');
require('./models/Collection');
require('./models/Transaction');
require('./models/Conversation');
require('./models/DailyReport');
require('./models/DailyPlan');
require('./models/WeeklyItinerary');
require('./models/Product');
const User = require('./models/User');


// --- MAIN ASYNC STARTUP FUNCTION ---
async function startServer() {
    try {
        // 1. Await the database connection FIRST
        await dbConnect();
        console.log("✅ Database connected successfully.");

        const app = express();
        app.set('trust proxy', 1);
        const server = http.createServer(app);
        const io = socketio(server);
        
        // ** THIS IS THE CRITICAL CHANGE **
        // Make the `io` instance available to all controllers via `req.app.get('io')`
        app.set('io', io);

        // 2. Initialize everything else AFTER the DB is connected
        initializeWebsockets(io);

        // --- MIDDLEWARE ---
        app.use(express.json({ limit: '50mb' }));
        app.use(express.urlencoded({ extended: true, limit: '50mb' }));
        app.use(express.static(path.join(__dirname, 'public')));

        app.set('view engine', 'ejs');
        app.set('views', path.join(__dirname, 'views'));

        const sessionStore = MongoStore.create({ 
            mongoUrl: process.env.MONGO_URI,
            collectionName: 'sessions'
        });
        sessionStore.on('error', function(error) {
            console.error('Session Store Error:', error);
        });

        app.use(session({
            secret: process.env.SESSION_SECRET,
            resave: false,
            saveUninitialized: false,
            store: sessionStore,
            cookie: { 
                secure: process.env.NODE_ENV === 'production',
                maxAge: 1000 * 60 * 60 * 24 // 1 day
            }
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

        // --- ROUTING ---
        app.use('/', require('./routes/auth'));
        app.use('/', require('./routes/views'));
        app.use('/orders', require('./routes/orders'));
        app.use('/checkin', require('./routes/checkin'));
        app.use('/collection', require('./routes/collection'));
        app.use('/chat', require('./routes/chat'));
        app.use('/api', require('./routes/api'));
        app.use('/users', require('./routes/users'));
        app.use('/report', require('./routes/dailyReport'));
        app.use('/planning', require('./routes/planning'));
        app.use('/products', require('./routes/products'));
        app.use('/analytics', require('./routes/analytics'));
        app.use('/push', require('./routes/push'));
        app.use('/transactions', require('./routes/transactions'));

        app.get('/health', (req, res) => {
            res.status(200).json({ status: 'ok', uptime: process.uptime() });
        });

        // 3. Start the server LAST
        const PORT = process.env.PORT || 3000;
        server.listen(PORT, () => {
            console.log(`🚀 Server is running on http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error("❌ Failed to start server:", error);
        process.exit(1);
    }
}

// --- Run the server ---
startServer();