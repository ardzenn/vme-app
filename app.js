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

// Create upload directories
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'public', 'uploads');
const ordersDir = path.join(uploadsDir, 'orders');
const chatDir = path.join(uploadsDir, 'chat');
const proofsDir = path.join(uploadsDir, 'proofs');
const othersDir = path.join(uploadsDir, 'others');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(ordersDir)) fs.mkdirSync(ordersDir, { recursive: true });
if (!fs.existsSync(chatDir)) fs.mkdirSync(chatDir, { recursive: true });
if (!fs.existsSync(proofsDir)) fs.mkdirSync(proofsDir, { recursive: true });
if (!fs.existsSync(othersDir)) fs.mkdirSync(othersDir, { recursive: true });

// Pre-load all models to prevent schema errors
require('./models/User');
require('./models/Order');
require('./models/Message');
require('./models/DirectMessage');
require('./models/Hospital');
require('./models/Doctor');
require('./models/CheckIn');
require('./models/Collection');
require('./models/Transaction');

const User = require('./models/User');

// --- 3. INITIALIZATION ---
dbConnect();
const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);
const io = socketio(server);

initializeWebsockets(io);

// --- 4. MIDDLEWARE ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// This is the correct session configuration for production
const sessionStore = MongoStore.create({ 
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions' // Optional: name of the collection for sessions
});

// Log any errors from the session store
sessionStore.on('error', function(error) {
    console.error('Session Store Error:', error);
});

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: sessionStore, // Use the persistent MongoStore
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24 // Cookie lasts for 1 day
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

// --- 5. ROUTING ---
const authRoutes = require('./routes/auth');
const viewRoutes = require('./routes/views');
const orderRoutes = require('./routes/orders');
const checkinRoutes = require('./routes/checkin');
const collectionRoutes = require('./routes/collection');
const apiRoutes = require('./routes/api');
const chatRoutes = require('./routes/chat');
const userRoutes = require('./routes/users');
const dailyReportRoutes = require('./routes/dailyReport');
const planningRoutes = require('./routes/planning');
const productRoutes = require('./routes/products');
const analyticsRoutes = require('./routes/analytics');
const pushRoutes = require('./routes/push');
const transactionRoutes = require('./routes/transactions');





// Health Check Route for deployment
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

app.use('/', authRoutes);
app.use('/', viewRoutes);
app.use('/orders', orderRoutes);
app.use('/checkin', checkinRoutes);
app.use('/collection', collectionRoutes);
app.use('/chat', chatRoutes);
app.use('/api', apiRoutes);
app.use('/users', userRoutes);
app.use('/report', dailyReportRoutes);
app.use('/planning', planningRoutes);
app.use('/products', productRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/push', pushRoutes);
app.use('/transactions', transactionRoutes);




// --- 6. SERVER LISTENING ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
