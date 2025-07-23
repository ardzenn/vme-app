const { body } = require('express-validator');

exports.validateSignup = [
    body('username', 'Please enter a valid email address').isEmail().normalizeEmail(),
    body('firstName', 'First name is required').not().isEmpty().trim().escape(),
    body('lastName', 'Last name is required').not().isEmpty().trim().escape(),
    body('password', 'Password must be at least 6 characters long').isLength({ min: 6 })
];

exports.validatePasswordReset = [
     body('password', 'Password must be at least 6 characters long').isLength({ min: 6 }),
     body('confirmPassword', 'Passwords do not match').custom((value, { req }) => value === req.body.password)
];

// Add other validators as needed, e.g., for orders or checkins
