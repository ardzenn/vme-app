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
const methodOverride = require('method-override');

// --- 2. LOCAL IMPORTS ---
const dbConnect = require('./dbConnect');
const initializeWebsockets = require('./websockets');
const { ensureAuthenticated } = require('./middleware/auth'); // Add this import

// --- Create upload directories ---
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// --- Pre-load all models to prevent schema errors ---
require('./models/User');
require('./models/Hospital');
require('./models/Doctor');
require('./models/Product');
require('./models/Order');
require('./models/Message');
require('./models/CheckIn');
require('./models/Collection');
require('./models/Transaction');
require('./models/Conversation');
require('./models/DailyReport');
require('./models/DailyPlan');
require('./models/WeeklyItinerary');
require('./models/StockItem');
require('./models/InventoryMovement');
require('./models/Notification');
require('./models/Post');
require('./models/Comment');
const User = require('./models/User');
const locationRoutes = require('./routes/location');

// --- MAIN ASYNC STARTUP FUNCTION ---
async function startServer() {
    try {
        await dbConnect();
        console.log("✅ Database connected successfully.");

        const app = express();
        app.set('trust proxy', 1);
        const server = http.createServer(app);
        const io = socketio(server);
        
        app.set('io', io);
        initializeWebsockets(io);

        // --- MIDDLEWARE ---
        app.use(express.json({ limit: '50mb' }));
        app.use(express.urlencoded({ extended: true, limit: '50mb' }));
        app.use(methodOverride('_method'));
        
        // Serve static files
        app.use(express.static(path.join(__dirname, 'public')));
        
        // Serve uploaded files from the uploads directory
        app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads'), {
            setHeaders: (res, path) => {
                // Set cache control headers for uploaded files (cache for 1 day)
                res.setHeader('Cache-Control', 'public, max-age=86400');
            }
        }));

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

        // Debug logging for session and authentication
        app.use((req, res, next) => {
            console.log('Session:', req.session);
            console.log('User:', req.user);
            next();
        });

        // Configure Passport with debug logging
        passport.use(new LocalStrategy(
            { usernameField: 'username' },
            async (username, password, done) => {
                try {
                    console.log('LocalStrategy - Authenticating user:', username);
                    const user = await User.findOne({ username: username });
                    
                    if (!user) {
                        console.log('LocalStrategy - User not found:', username);
                        return done(null, false, { message: 'Incorrect username.' });
                    }
                    
                    const isMatch = await user.authenticate(password);
                    if (!isMatch) {
                        console.log('LocalStrategy - Incorrect password for user:', username);
                        return done(null, false, { message: 'Incorrect password.' });
                    }
                    
                    console.log('LocalStrategy - Authentication successful for user:', user);
                    return done(null, user);
                } catch (err) {
                    console.error('LocalStrategy - Error during authentication:', err);
                    return done(err);
                }
            }
        ));
        
        passport.serializeUser((user, done) => {
            console.log('Serializing user:', user.id);
            done(null, user.id);
        });
        
        const mongoose = require('mongoose');
        passport.deserializeUser(async (id, done) => {
            try {
                console.log('Deserializing user with ID:', id);
                let user = null;
                // Check if id is a valid ObjectId
                if (mongoose.Types.ObjectId.isValid(id)) {
                    user = await User.findById(id);
                }
                // If not found or not valid ObjectId, try to find by email
                if (!user) {
                    console.log('User not found by _id or id is not ObjectId, trying email...');
                    user = await User.findOne({ email: id });
                }
                if (!user) {
                    console.error('User not found with id/email:', id);
                    return done(null, false);
                }
                console.log('Successfully deserialized user:', { 
                    id: user._id, 
                    email: user.email, 
                    username: user.username, 
                    role: user.role 
                });
                return done(null, user);
            } catch (err) {
                console.error('Error deserializing user:', err);
                return done(err);
            }
        });

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
        app.use('/notifications', require('./routes/notifications'));
        app.use('/api/conversations', require('./routes/conversations'));
        app.use('/feed', require('./routes/feed'));
        app.use('/admin', require('./routes/admin'));
        app.use('/location', locationRoutes);

// Redirect /my-weekly-itineraries to the correct planning route for user convenience
app.get('/my-weekly-itineraries', (req, res) => {
    res.redirect(301, '/planning/my-weekly-itineraries');
});


        // --- HEALTH CHECK ROUTES ---
        app.get('/health', (req, res) => {
            res.status(200).json({ 
                status: 'OK', 
                timestamp: new Date().toISOString(),
                service: 'VME App',
                uptime: process.uptime(),
                version: '1.0.0'
            });
        });

        // Alternative simple health check
        app.get('/ping', (req, res) => {
            res.status(200).send('pong');
        });

        const PORT = process.env.PORT || 3000;
        server.listen(PORT, () => {
            console.log(`🚀 Server is running on http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error("❌ Failed to start server:", error);
        process.exit(1);
    }
}

startServer();