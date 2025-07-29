const mongoose = require('mongoose');
const User = mongoose.model('User');
const upload = require('../config/cloudinary'); // Assumes your cloudinary config is here

// --- Cloudinary Upload Middleware ---
// This middleware will handle uploading the image to Cloudinary when a user submits their profile.
// The public URL from Cloudinary will be available in `req.file.path`.
exports.uploadProfilePicture = upload.single('profilePicture');


// --- Controller Functions ---

// Handles updating a user's own profile information.
exports.updateProfile = async (req, res) => {
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

        // If a new file was uploaded, req.file will exist.
        // The path property will contain the secure URL from Cloudinary.
        if (req.file && req.file.path) {
            user.profilePicture = req.file.path;
        }

        await user.save();
        req.flash('success_msg', 'Profile updated successfully!');
        res.redirect('/profile');

    } catch (dbErr) {
        console.error("Profile update error:", dbErr);
        req.flash('error_msg', 'An error occurred while updating your profile.');
        res.redirect('/profile');
    }
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

// Handles an admin deleting a user.
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