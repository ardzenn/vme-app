const express = require('express');
const { authMiddleware, roleMiddleware } = require('./auth');
const CheckIn = require('../models/CheckIn.js');
const Order = require('../models/Order.js');
const Collection = require('../models/Collection.js');

const router = express.Router();

router.use(authMiddleware, roleMiddleware(['Accounting']));

router.get('/dashboard', async (req, res) => {
  const checkins = await CheckIn.find().sort({ 'location.timestamp': -1 }).populate('user hospital doctor');
  const orders = await Order.find().sort({ timestamp: -1 }).populate('user');
  const collections = await Collection.find().sort({ timestamp: -1 }).populate('user');
  res.render('accounting-dashboard', { checkins, orders, collections });
});

module.exports = router;