const mongoose = require('mongoose');
const User = mongoose.model('User');
const multer = require('multer');
const path = require('path');

// --- Multer Configuration for File Uploads ---
// This sets up how and where to save uploaded files.
const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: function (req, file, cb) {
        // Create a unique filename: userId-timestamp.extension
        cb(null, `${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

// This middleware will process the image upload.
const upload = multer({
    storage: storage,
    limits: { fileSize: 2000000 }, // 2MB Limit
    fileFilter: function (req, file, cb) {
        // Allow images only (jpeg, jpg, png, gif)
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb('Error: File upload only supports the following filetypes - ' + filetypes);
    }
}).single('profilePicture'); // 'profilePicture' must match the name attribute in your form's file input


// --- Controller Functions ---

// Handles updating a user's own profile information.
exports.updateProfile = (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            // Handle upload errors (e.g., wrong file type, file too large)
            req.flash('error_msg', err);
            return res.redirect('/profile');
        }

        try {
            const user = await User.findById(req.user.id);
            if (!user) {
                req.flash('error_msg', 'User not found.');
                return res.redirect('/profile');
            }

            // Update text fields
            user.firstName = req.body.firstName;
            user.lastName = req.body.lastName;
            user.birthdate = req.body.birthdate;
            user.area = req.body.area;
            user.address = req.body.address;

            // If a new file was uploaded, update the profile picture path
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
