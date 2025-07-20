const express = require('express');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const { authMiddleware, roleMiddleware } = require('./auth');
const Order = require('../models/Order.js');
const Message = require('../models/Message.js');

const router = express.Router();

router.use(authMiddleware, roleMiddleware(['MSR', 'KAS', 'Accounting', 'Admin']));

router.get('/book', (req, res) => res.render('bookorder'));

router.post('/book', upload.single('attachment'), async (req, res) => {
  const { customerName, address, products } = req.body; // products as JSON string, parse
  const attachment = req.file ? `/uploads/${req.file.filename}` : null;
  const order = new Order({ user: req.user.id, customerName, address, products: JSON.parse(products), attachment });
  await order.save();
  res.redirect('/dashboard');
});

router.get('/:id', async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user');
  const messages = await Message.find({ order: req.params.id }).populate('user');
  res.render('order-detail', { order, messages, user: req.user });
});

// Post message (handled via Socket.io in client, but fallback POST)
router.post('/:id/message', upload.single('attachment'), async (req, res) => {
  const { text } = req.body;
  const attachment = req.file ? `/uploads/${req.file.filename}` : null;
  const message = new Message({ order: req.params.id, user: req.user.id, text, attachment });
  await message.save();
  res.redirect(`/order/${req.params.id}`);
});

module.exports = router;