const express = require('express');
const { authMiddleware, roleMiddleware } = require('./auth');
const CheckIn = require('../models/CheckIn.js');
const Order = require('../models/Order.js');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  const { role, id } = req.user;
  if (role === 'Admin') return res.redirect('/admin/dashboard');
  if (role === 'Accounting') return res.redirect('/accounting/dashboard');
  const checkins = await CheckIn.find({ user: id }).sort({ 'location.timestamp': -1 }).populate('user hospital doctor');
  const orders = await Order.find({ user: id }).sort({ timestamp: -1 }).populate('user');
  res.render('dashboard', { user: req.user, checkins, orders });
});

module.exports = router;