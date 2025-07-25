const Transaction = require('../models/Transaction');
const upload = require('../config/cloudinary');

// Middleware for a single proof upload
exports.uploadAttachment = upload.single('attachment');
exports.uploadCommentAttachment = upload.single('commentAttachment');

// Views
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
exports.getMySubmissionsPage = async (req, res) => {
    try {
        const transactions = await Transaction.find({ user: req.user.id }).populate('user').sort({ createdAt: -1 });
        res.render('my-submissions', { transactions });
    } catch (err) {
        req.flash('error_msg', 'Could not load your submissions.');
        res.redirect('/dashboard');
    }
};

// API
exports.submitTransaction = async (req, res) => {
    try {
        const { type, customer, hospital, amount, remarks } = req.body;
        const newTransactionData = {
            user: req.user.id,
            type,
            customer,
            hospital,
            amount: parseFloat(amount),
            remarks,
            attachmentUrl: req.file ? req.file.path : null
        };
        const newTransaction = new Transaction(newTransactionData);
        await newTransaction.save();
        req.flash('success_msg', `${type} submitted successfully!`);
        res.redirect('/dashboard');
    } catch (err) {
        console.error("Transaction submission error:", err);
        req.flash('error_msg', 'Failed to submit.');
        res.redirect('/transactions');
    }
};