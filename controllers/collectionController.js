const Collection = require('../models/Collection');
const { validationResult } = require('express-validator');

exports.createCollection = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error_msg', errors.array()[0].msg);
        return res.redirect('/collection'); // Or wherever the form is
    }

    try {
        const { clientName, collectionType, amount, remarks } = req.body;
        const newCollection = new Collection({
            user: req.user.id,
            clientName,
            collectionType,
            amount,
            remarks
        });

        await newCollection.save();
        req.flash('success_msg', 'Collection recorded successfully!');
        res.redirect('/dashboard');

    } catch (err) {
        console.error("Collection error:", err);
        req.flash('error_msg', 'Failed to record collection. Please try again.');
        res.redirect('back');
    }
};