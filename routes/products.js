const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { ensureAuthenticated, ensureAdmin } = require('../middleware/auth');

// GET route to display the main product gallery for all users
router.get('/', ensureAuthenticated, productController.getProductGallery);

// GET route for Admins to manage products
router.get('/manage', ensureAuthenticated, ensureAdmin, productController.getManageProducts);

// POST route to add a single new product
router.post('/add', 
    ensureAuthenticated, 
    ensureAdmin, 
    productController.uploadProductImage, 
    productController.addProduct
);

// ** DELETE ROUTE PATH CORRECTED **
router.post('/delete/:id', 
    ensureAuthenticated, 
    ensureAdmin, 
    productController.deleteProduct
);

// POST route to bulk add products from a CSV file
router.post('/import', 
    ensureAuthenticated, 
    ensureAdmin, 
    productController.uploadCsvFile, 
    productController.importProducts
);

module.exports = router;