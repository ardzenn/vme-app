const express = require('express');
const { authMiddleware, roleMiddleware } = require('./auth');
const User = require('../models/User.js');
const CheckIn = require('../models/CheckIn.js');
const Order = require('../models/Order.js');
const Collection = require('../models/Collection.js');

const router = express.Router();

router.use(authMiddleware, roleMiddleware(['Admin']));

router.get('/dashboard', async (req, res) => {
  const users = await User.find({ role: { $in: ['MSR', 'KAS'] } });
  const checkins = await CheckIn.find().sort({ 'location.timestamp': -1 }).populate('user hospital doctor');
  const orders = await Order.find().sort({ timestamp: -1 }).populate('user');
  const collections = await Collection.find().sort({ timestamp: -1 }).populate('user');
  res.render('admin-dashboard', { users, checkins, orders, collections });
});

module.exports = router;