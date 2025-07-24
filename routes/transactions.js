// in routes/transactions.js
const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { ensureAuthenticated } = require('../middleware/auth');

// MSR/KAS routes
router.get('/', ensureAuthenticated, transactionController.getTransactionPage);
router.post('/', ensureAuthenticated, transactionController.uploadAttachment, transactionController.submitTransaction);
router.get('/my-submissions', ensureAuthenticated, transactionController.getMySubmissionsPage); 

// Admin/Accounting routes
router.get('/history', ensureAuthenticated, transactionController.getTransactionHistory);
router.get('/:id', ensureAuthenticated, transactionController.getTransactionDetails);

// FIXED: This now correctly handles the upload and sends a response
router.post('/:id/comment/attach', ensureAuthenticated, transactionController.uploadCommentAttachment, (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }
    res.json({ success: true, url: `/uploads/txn_comments/${req.file.filename}` });
});

module.exports = router;