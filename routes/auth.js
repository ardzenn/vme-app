// routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User.js');

const router = express.Router();

router.get('/login', (req, res) => res.render('login', { error: null }));
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user || !(await user.comparePassword(password))) {
    return res.render('login', { error: 'Invalid credentials' });
  }
  if (user.role === 'Pending') return res.render('waiting', { user });
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.cookie('token', token, { httpOnly: true });
  res.redirect('/dashboard');
});

router.get('/signup', (req, res) => res.render('signup', { error: null }));
router.post('/signup', async (req, res) => {
  const { firstName, lastName, birthdate, area, address, username, password } = req.body;
  try {
    // Validate and parse birthdate
    const birthdateObj = new Date(birthdate);
    if (isNaN(birthdateObj.getTime())) {
      throw new Error('Invalid birthdate format');
    }
    const user = new User({ firstName, lastName, birthdate: birthdateObj, area, address, username, password });
    await user.save();
    res.redirect('/login');
  } catch (err) {
    res.render('signup', { error: err.message || 'Username taken' });
  }
});

router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
});

// Middleware for auth
function authMiddleware(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.redirect('/login');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.redirect('/login');
  }
}

// Role check
function roleMiddleware(roles) {
  return (req, res, next) => {
    if (req.user.role === 'Pending') return res.render('waiting', { user: req.user });
    if (!roles.includes(req.user.role)) return res.status(403).send('Access denied');
    next();
  };
}

router.authMiddleware = authMiddleware;
router.roleMiddleware = roleMiddleware;

module.exports = router;