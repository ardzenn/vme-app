// in routes/products.js
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { ensureAuthenticated, ensureAdmin, ensureAccounting } = require('../middleware/auth');

// Middleware to protect management routes
const canManageProducts = (req, res, next) => {
    if (req.user.role === 'Admin' || req.user.role === 'Accounting') {
        return next();
    }
    req.flash('error_msg', 'Access Denied.');
    res.redirect('/dashboard');
};

// Route for MSR/KAS to view the product gallery
router.get('/', ensureAuthenticated, productController.getProductGallery);

// Routes for Admin/Accounting to manage products
router.get('/manage', ensureAuthenticated, canManageProducts, productController.getManageProducts);
router.post('/manage/add', ensureAuthenticated, canManageProducts, productController.uploadProductImage, productController.createProduct);
router.post('/manage/delete/:id', ensureAuthenticated, canManageProducts, productController.deleteProduct);

module.exports = router;