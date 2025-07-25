const mongoose = require('mongoose');
const User = mongoose.model('User');
const multer = require('multer');
const path = require('path');

// --- Multer Configuration for File Uploads ---
const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: function (req, file, cb) {
        cb(null, `${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 2000000 }, // 2MB Limit
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb('Error: File upload only supports the following filetypes - ' + filetypes);
    }
}).single('profilePicture');


// --- Controller Functions ---

// Handles updating a user's own profile information.
exports.updateProfile = (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            req.flash('error_msg', err);
            return res.redirect('/profile');
        }

        try {
            const user = await User.findById(req.user.id);
            if (!user) {
                req.flash('error_msg', 'User not found.');
                return res.redirect('/profile');
            }

            user.firstName = req.body.firstName;
            user.lastName = req.body.lastName;
            user.birthdate = req.body.birthdate;
            user.area = req.body.area;
            user.address = req.body.address;

            if (req.file) {
                user.profilePicture = `/uploads/${req.file.filename}`;
            }

            await user.save();
            req.flash('success_msg', 'Profile updated successfully!');
            res.redirect('/profile');

        } catch (dbErr) {
            console.error("Profile update error:", dbErr);
            req.flash('error_msg', 'An error occurred while updating your profile.');
            res.redirect('/profile');
        }
    });
};

// Handles an admin updating another user's role.
exports.updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;
        const userId = req.params.id;
        await User.findByIdAndUpdate(userId, { role });
        req.flash('success_msg', 'User role updated successfully.');
        res.redirect('/admin-dashboard');
    } catch (err) {
        console.error("Role update error:", err);
        req.flash('error_msg', 'Failed to update user role.');
        res.redirect('/admin-dashboard');
    }
};

// NEW: Handles an admin deleting a user.
exports.deleteUser = async (req, res) => {
    try {
        // Safety check: prevent an admin from deleting their own account
        if (req.params.id === req.user.id) {
            req.flash('error_msg', 'You cannot delete your own account.');
            return res.redirect('/admin-dashboard');
        }

        await User.findByIdAndDelete(req.params.id);
        req.flash('success_msg', 'User has been deleted successfully.');
        res.redirect('/admin-dashboard');
    } catch (err) {
        console.error("Delete user error:", err);
        req.flash('error_msg', 'Failed to delete user.');
        res.redirect('/admin-dashboard');
    }
};
