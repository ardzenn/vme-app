// in routes/transactions.js
const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { ensureAuthenticated } = require('../middleware/auth');

// MSR/KAS routes
router.get('/', ensureAuthenticated, transactionController.getTransactionPage);
router.post('/', ensureAuthenticated, transactionController.uploadAttachment, transactionController.submitTransaction);

// Admin/Accounting routes
router.get('/history', ensureAuthenticated, transactionController.getTransactionHistory);
router.get('/:id', ensureAuthenticated, transactionController.getTransactionDetails);

module.exports = router;