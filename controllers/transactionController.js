const Transaction = require('../models/Transaction');
const upload = require('../config/cloudinary');

// --- Middleware ---
exports.uploadAttachment = upload.single('attachment');
exports.uploadCommentAttachment = upload.single('commentAttachment');

// --- Views ---
exports.getTransactionPage = (req, res) => {
    res.render('transactions');
};

exports.getTransactionHistory = async (req, res) => {
    try {
        const transactions = await Transaction.find().populate('user', 'firstName lastName').sort({ createdAt: -1 });
        res.render('transaction-history', { transactions });
    } catch (err) {
        req.flash('error_msg', 'Could not load transaction history.');
        res.redirect('/admin-dashboard');
    }
};

exports.getTransactionDetails = async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id).populate('user').populate('comments.user');
        if (!transaction) {
            req.flash('error_msg', 'Transaction not found.');
            return res.redirect('/transactions/history');
        }
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

// --- API ---

// REWRITTEN: This function now correctly handles both 'Collection' and 'Deposit' types.
exports.submitTransaction = async (req, res) => {
    try {
        const { type } = req.body;

        // Start with the common data for both types
        let newTransactionData = {
            user: req.user.id,
            type,
            note: req.body.note,
            remarks: req.body.remarks,
            attachmentUrl: req.file ? req.file.path : null
        };

        // Add specific fields based on the transaction type
        if (type === 'Collection') {
            const { customer, dateCollected, prCr, siDr, dateOfCheck, bankCheckNo, amount } = req.body;
            Object.assign(newTransactionData, {
                customer,
                dateCollected,
                prCr,
                siDr,
                dateOfCheck,
                bankCheckNo,
                amount: parseFloat(amount) || 0
            });
        } else if (type === 'Deposit') {
            const { details, hospital, dateDeposited, paymentMethod, totalAmountDeposited } = req.body;
            Object.assign(newTransactionData, {
                details,
                hospital,
                dateDeposited,
                paymentMethod,
                totalAmountDeposited: parseFloat(totalAmountDeposited) || 0
            });
        } else {
            // Handle cases where the type is missing or invalid
            req.flash('error_msg', 'Invalid transaction type specified.');
            return res.redirect('/transactions');
        }
        
        const newTransaction = new Transaction(newTransactionData);
        await newTransaction.save();
        
        req.flash('success_msg', `${type} submitted successfully!`);
        res.redirect('/transactions/my-submissions');

    } catch (err) {
        console.error("Transaction submission error:", err);
        // Give a more helpful error message if it's a validation failure
        if (err.name === 'ValidationError') {
            let messages = Object.values(err.errors).map(val => val.message);
            req.flash('error_msg', `Please check your input: ${messages.join(', ')}`);
        } else {
            req.flash('error_msg', 'An internal server error occurred. Failed to submit the transaction.');
        }
        res.redirect('/transactions');
    }
};
