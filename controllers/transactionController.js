const Transaction = require('../models/Transaction');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let dest = './public/uploads/transactions/';
        // Check if the route is for a comment attachment
        if (req.originalUrl.includes('/comment/attach')) {
            dest = './public/uploads/txn_comments/';
        }
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        cb(null, `txn-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage });

// --- Middleware Exports ---
// For the main transaction form
exports.uploadAttachment = upload.single('attachment');
exports.uploadCommentAttachment = upload.single('commentAttachment');

// --- Views ---
exports.getTransactionPage = (req, res) => {
    res.render('transactions');
};

exports.getTransactionHistory = async (req, res) => {
    try {
        const transactions = await Transaction.find().populate('user').sort({ createdAt: -1 });
        res.render('transaction-history', { transactions });
    } catch (err) {
        req.flash('error_msg', 'Could not load history.');
        res.redirect('/admin-dashboard');
    }
};

exports.getTransactionDetails = async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id).populate('user').populate('comments.user');
        res.render('transaction-detail', { transaction });
    } catch (err) {
        req.flash('error_msg', 'Could not load transaction details.');
        res.redirect('/transactions/history');
    }
};

// --- API ---
exports.submitTransaction = async (req, res) => {
    try {
        if (!req.file) {
            req.flash('error_msg', 'An attachment is required.');
            return res.redirect('/transactions');
        }
        const newTransaction = new Transaction({
            ...req.body,
            user: req.user.id,
            attachmentUrl: `/uploads/transactions/${req.file.filename}`
        });
        await newTransaction.save();
        req.flash('success_msg', `${req.body.type} submitted successfully!`);
        res.redirect('/dashboard');
    } catch (err) {
        console.error("Transaction submission error:", err);
        req.flash('error_msg', 'Failed to submit.');
        res.redirect('/transactions');
    }
};

exports.getMySubmissionsPage = async (req, res) => {
    try {
        const transactions = await Transaction.find({ user: req.user.id }).populate('user').sort({ createdAt: -1 });
        res.render('my-submissions', { transactions }); // Render the new page
    } catch (err) {
        req.flash('error_msg', 'Could not load your submission history.');
        res.redirect('/dashboard');
    }
};