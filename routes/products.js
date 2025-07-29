const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { ensureAuthenticated, ensureAdmin } = require('../middleware/auth');

// --- PRODUCT ROUTES ---
router.get('/', ensureAuthenticated, productController.getProductGallery);
router.get('/manage', ensureAuthenticated, ensureAdmin, productController.getManageProducts);
router.post('/add', ensureAuthenticated, ensureAdmin, productController.uploadProductImage, productController.addProduct);

// MODIFIED: This route now archives/restores a product instead of deleting
router.post('/toggle-status/:id', 
    ensureAuthenticated, 
    ensureAdmin, 
    productController.toggleProductStatus
);

router.post('/import', ensureAuthenticated, ensureAdmin, productController.uploadCsvFile, productController.importProducts);

// --- INVENTORY ROUTES ---
router.get('/inventory/:id', ensureAuthenticated, ensureAdmin, productController.getInventoryDetail);
router.post('/inventory/receive/:id', ensureAuthenticated, ensureAdmin, productController.receiveStock);

module.exports = router;