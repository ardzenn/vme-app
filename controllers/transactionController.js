const Transaction = require('../models/Transaction');
const upload = require('../config/cloudinary');
const { createNotificationsForGroup, createNotification, getFinanceAndAdminIds } = require('../services/notificationService');

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

// --- API & Actions ---
exports.submitTransaction = async (req, res) => {
    try {
        const { type } = req.body;

        let newTransactionData = {
            user: req.user.id,
            type,
            note: req.body.note,
            remarks: req.body.remarks,
            attachmentUrl: req.file ? req.file.path : null
        };

        if (type === 'Collection') {
            const { customer, dateCollected, prCr, siDr, dateOfCheck, bankCheckNo, amount } = req.body;
            Object.assign(newTransactionData, { customer, dateCollected, prCr, siDr, dateOfCheck, bankCheckNo, amount: parseFloat(amount) || 0 });
        } else if (type === 'Deposit') {
            const { details, hospital, dateDeposited, paymentMethod, totalAmountDeposited } = req.body;
            Object.assign(newTransactionData, { details, hospital, dateDeposited, paymentMethod, totalAmountDeposited: parseFloat(totalAmountDeposited) || 0 });
        } else {
            req.flash('error_msg', 'Invalid transaction type specified.');
            return res.redirect('/transactions');
        }
        
        const newTransaction = new Transaction(newTransactionData);
        await newTransaction.save();
        
        const io = req.app.get('io');
        const financeUsers = await getFinanceAndAdminIds();
        const notificationText = `${req.user.firstName} ${req.user.lastName} submitted a new ${type}.`;
        const notificationLink = `/admin-dashboard#transactions-panel`;
        await createNotificationsForGroup(io, financeUsers, notificationText, notificationLink);

        req.flash('success_msg', `${type} submitted successfully!`);
        res.redirect('/transactions/my-submissions');

    } catch (err) {
        console.error("Transaction submission error:", err);
        if (err.name === 'ValidationError') {
            let messages = Object.values(err.errors).map(val => val.message);
            req.flash('error_msg', `Please check your input: ${messages.join(', ')}`);
        } else {
            req.flash('error_msg', 'An internal server error occurred. Failed to submit the transaction.');
        }
        res.redirect('/transactions');
    }
};

// ADDED: New function to handle adding comments to a transaction
exports.addComment = async (req, res) => {
    try {
        const { text } = req.body;
        const transactionId = req.params.id;

        const newComment = {
            user: req.user.id,
            text: text,
            createdAt: new Date()
        };

        const transaction = await Transaction.findByIdAndUpdate(
            transactionId,
            { $push: { comments: newComment } },
            { new: true }
        );

        // Notify the original submitter of the transaction, if it wasn't them who commented
        if (transaction.user.toString() !== req.user.id.toString()) {
            const io = req.app.get('io');
            const notificationText = `${req.user.firstName} commented on your ${transaction.type} submission.`;
            const notificationLink = `/transactions/${transaction._id}`;
            await createNotification(io, transaction.user, notificationText, notificationLink);
        }

        req.flash('success_msg', 'Comment added successfully.');
        res.redirect(`/transactions/${transactionId}`);

    } catch (err) {
        console.error("Add comment error:", err);
        req.flash('error_msg', 'Failed to add your comment.');
        res.redirect(`/transactions/${req.params.id}`);
    }
};