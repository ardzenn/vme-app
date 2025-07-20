const express = require('express');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const { authMiddleware } = require('./auth');
const User = require('../models/User.js');

const router = express.Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  const user = await User.findById(req.user.id);
  res.render('profile', { user });
});

router.post('/', upload.single('profilePicture'), async (req, res) => {
  const profilePicture = req.file ? `/uploads/${req.file.filename}` : null;
  await User.findByIdAndUpdate(req.user.id, { profilePicture });
  res.redirect('/profile');
});

module.exports = router;