const express = require('express');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { authMiddleware, roleMiddleware } = require('./auth');
const Collection = require('../models/Collection.js');

const router = express.Router();

router.use(authMiddleware, roleMiddleware(['MSR', 'KAS']));

router.get('/', (req, res) => res.render('collection'));

router.post('/', upload.single('file'), async (req, res) => {
  const { type } = req.body;
  const file = req.file ? `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}` : null; // Save as base64
  const collection = new Collection({ user: req.user.id, file, type });
  await collection.save();
  res.redirect('/dashboard');
});

module.exports = router;