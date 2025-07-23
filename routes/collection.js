const express = require('express');
const collectionController = require('../controllers/collectionController');
const { ensureAuthenticated } = require('../middleware/auth');

const router = express.Router();

// This route handles the form submission for a new collection
router.post('/', ensureAuthenticated, collectionController.createCollection);

module.exports = router;
