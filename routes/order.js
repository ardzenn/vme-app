const express = require('express');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { authMiddleware, roleMiddleware } = require('./auth');
const Order = require('../models/Order.js');
const Message = require('../models/Message.js');

const router = express.Router();

router.use(authMiddleware, roleMiddleware(['MSR', 'KAS', 'Accounting', 'Admin']));

router.get('/book', (req, res) => res.render('bookorder', { user: req.user }));

router.post('/book', upload.single('attachment'), async (req, res) => {
  const { customerName, area, hospital, contactNumber, email, note, subtotal } = req.body;
  const products = [];
  let i = 0;
  while (req.body[`products[${i}][product]`]) {
    products.push({
      product: req.body[`products[${i}][product]`],
      quantity: parseFloat(req.body[`products[${i}][quantity]`]),
      price: parseFloat(req.body[`products[${i}][price]`]),
      total: parseFloat(req.body[`products[${i}][total]`])
    });
    i++;
  }
  const reference = `SALES-${Date.now().toString().slice(-6)}${new Date().getFullYear()}`;
  const attachment = req.file ? `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}` : null; // Save as base64
  const order = new Order({ user: req.user.id, customerName, area, hospital, contactNumber, email, note, products, subtotal: parseFloat(subtotal), attachment, reference });
  await order.save();
  res.redirect('/dashboard');
});

router.get('/:id', async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user');
  const messages = await Message.find({ order: req.params.id }).populate('user');
  res.render('order-detail', { order, messages, user: req.user });
});

router.post('/:id/message', upload.single('attachment'), async (req, res) => {
  const { text } = req.body;
  const attachment = req.file ? `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}` : null; // Save as base64
  const message = new Message({ order: req.params.id, user: req.user.id, text, attachment });
  await message.save();
  const populatedMsg = await Message.findById(message._id).populate('user');
  io.to(req.params.id.toString()).emit('newMessage', populatedMsg);
  res.json({ success: true });
});

module.exports = router;