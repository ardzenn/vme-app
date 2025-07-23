// This middleware ensures that a user is logged in.
// If not, it redirects them to the login page.
module.exports.ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash('error_msg', 'Please log in to view this resource.');
    res.redirect('/login');
};

// This middleware checks if the logged-in user has the 'Admin' role.
// If not, it redirects them away.
module.exports.ensureAdmin = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'Admin') {
        return next();
    }
    req.flash('error_msg', 'You do not have permission to view this page.');
    res.redirect('/dashboard');
};

// This middleware checks if the logged-in user has the 'Accounting' role.
module.exports.ensureAccounting = (req, res, next) => {
    if (req.user.role === 'Accounting' || req.user.role === 'Admin') {
        return next();
    }
    req.flash('error_msg', 'You do not have permission to view this page.');
    res.redirect('/dashboard');
};

// You can add other role checks here as needed, for example:
module.exports.ensureMSR = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'MSR') {
        return next();
    }
    req.flash('error_msg', 'You do not have permission to view this page.');
    res.redirect('/dashboard');
};
