// This middleware ensures that a user is logged in.
module.exports.ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash('error_msg', 'Please log in to view this resource.');
    res.redirect('/login');
};

// NEW: A flexible role-checking middleware.
// It accepts an array of roles and grants access if the user has any one of them.
module.exports.ensureHasRole = (roles) => {
    return (req, res, next) => {
        if (req.isAuthenticated() && req.user && roles.includes(req.user.role)) {
            return next();
        }
        req.flash('error_msg', 'You do not have permission to view this page.');
        res.redirect('/dashboard');
    };
};

// --- Existing middleware can now use the new flexible function ---

// This middleware checks if the logged-in user has the 'Admin' role.
module.exports.ensureAdmin = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'Admin') {
        return next();
    }
    req.flash('error_msg', 'You do not have permission to view this page.');
    res.redirect('/dashboard');
};

// This middleware checks if the logged-in user has 'Accounting' or 'Admin' role.
module.exports.ensureAccounting = (req, res, next) => {
    if (req.user.role === 'Accounting' || req.user.role === 'Admin') {
        return next();
    }
    req.flash('error_msg', 'You do not have permission to view this page.');
    res.redirect('/dashboard');
};

module.exports.ensureMSR = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'MSR') {
        return next();
    }
    req.flash('error_msg', 'You do not have permission to view this page.');
    res.redirect('/dashboard');
};