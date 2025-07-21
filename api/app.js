// Load environment variables
require('dotenv').config();

// Core & NPM Packages
const path = require('path');
const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const socketIo = require('socket.io');

// --- 1. DEFINE THE MAIN APPLICATION FUNCTION ---
const startServer = async () => {
    // --- DATABASE CONNECTION TEST ---
    // This will now happen first. If it fails, the entire app will stop.
    try {
        console.log('Attempting to connect to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('>>>>>>>>>>>>>> DATABASE CONNECTION SUCCEEDED. <<<<<<<<<<<<<<');
    } catch (err) {
        console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        console.error('!!!         DATABASE CONNECTION FAILED         !!!');
        console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        console.error('The error is:', err);
        process.exit(1); // Stop the server if DB connection fails
    }

    // --- INITIAL APP, SERVER, and SOCKET.IO SETUP ---
    const app = express();
    const server = http.createServer(app);
    const io = socketIo(server);

    // --- MODELS ---
    const User = require('../models/User');
    const Order = require('../models/Order');
    const CheckIn = require('../models/CheckIn');
    const Hospital = require('../models/Hospital');
    const Doctor = require('../models/Doctor');
    const Message = require('../models/Message');

    // --- MIDDLEWARE & VIEW ENGINE ---
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, '../views'));
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(cookieParser());
    app.use(express.static(path.join(__dirname, '../public')));

    // --- ROUTES ---
    // (Your complete routes for auth, dashboard, etc. would go here,
    // but we are keeping it simple to test the connection first.)
    app.get('/', (req, res) => {
        res.send('<h1>Server is running and connected to the database!</h1><p>You can now restore your full application code.</p>');
    });


    // --- START THE SERVER ---
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`>>>>>> SERVER IS RUNNING ON PORT ${PORT} <<<<<<`);
    });
};

// --- RUN THE APPLICATION ---
startServer();