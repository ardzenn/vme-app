const express = require('express');
const userController = require('../controllers/userController');
const { ensureAuthenticated, ensureAdmin } = require('../middleware/auth');
const router = express.Router();

// Wires the URL POST /update-role/:id to the updateUserRole controller function - AG
router.post('/update-role/:id', ensureAuthenticated, ensureAdmin, userController.updateUserRole);

// MODIFIED: Added the uploadProfilePicture middleware to the route
// This will upload the file to Cloudinary first, then update the profile.
router.post('/profile', 
    ensureAuthenticated, 
    userController.uploadProfilePicture, // This is the new part
    userController.updateProfile
);

//  Wires the URL POST /delete/:id to the deleteUser controller function  - AG
router.post('/delete/:id', ensureAuthenticated, ensureAdmin, userController.deleteUser);

module.exports = router;