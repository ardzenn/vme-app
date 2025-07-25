const express = require('express');
const userController = require('../controllers/userController');
const { ensureAuthenticated, ensureAdmin } = require('../middleware/auth');
const router = express.Router();

// Wires the URL POST /update-role/:id to the updateUserRole controller function
router.post('/update-role/:id', ensureAuthenticated, ensureAdmin, userController.updateUserRole);

// Wires the URL POST /profile to the updateProfile controller function
router.post('/profile', ensureAuthenticated, userController.updateProfile);

//Wires the URL POST /delete/:id to the deleteUser controller function
router.post('/delete/:id', ensureAuthenticated, ensureAdmin, userController.deleteUser);

module.exports = router;
