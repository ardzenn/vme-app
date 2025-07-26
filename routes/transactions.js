const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { ensureAuthenticated } = require('../middleware/auth');

// GET route to display the new submission form page
router.get('/', ensureAuthenticated, transactionController.getTransactionPage);

// POST route to handle the form submission
router.post('/submit', 
    ensureAuthenticated, 
    transactionController.uploadAttachment, 
    transactionController.submitTransaction
);

// GET route for MSR/KAS to see their own submissions
router.get('/my-submissions', ensureAuthenticated, transactionController.getMySubmissionsPage);

// GET route for Admins/Accounting to see all submissions
router.get('/history', ensureAuthenticated, transactionController.getTransactionHistory);

// GET route to view a single transaction's details
router.get('/:id', ensureAuthenticated, transactionController.getTransactionDetails);

// POST route for uploading comment attachments
router.post('/:id/comment/attach', 
    ensureAuthenticated, 
    transactionController.uploadCommentAttachment, 
    (req, res) => {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded.' });
        }
        res.json({ success: true, url: req.file.path });
    }
);

module.exports = router;