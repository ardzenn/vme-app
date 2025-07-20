const express = require('express');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const { authMiddleware, roleMiddleware } = require('./auth');
const Collection = require('../models/Collection');

const router = express.Router();

router.use(authMiddleware, roleMiddleware(['MSR', 'KAS']));

router.get('/', (req, res) => res.render('collection'));

router.post('/', upload.single('file'), async (req, res) => {
  const { type } = req.body;
  const file = `/uploads/${req.file.filename}`;
  const collection = new Collection({ user: req.user.id, file, type });
  await collection.save();
  res.redirect('/dashboard');
});

module.exports = router;