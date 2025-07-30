const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { ensureAuthenticated, ensureAdmin, ensureHasRole } = require('../middleware/auth');
const Product = require('../models/Product');
const User = require('../models/User');

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

// ADD THIS NEW ROUTE FOR INVENTORY DASHBOARD
router.get('/inventory-dashboard', 
    ensureAuthenticated, 
    ensureHasRole(['Admin', 'Accounting', 'Sales Manager', 'Inventory']), 
    productController.getInventoryDashboard
);

// Add the adjust stock route
router.post('/inventory/adjust/:id', ensureAuthenticated, ensureAdmin, async (req, res) => {
    try {
        const { adjustment, reason } = req.body;
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        
        const previousStock = product.stock || 0;
        product.stock = previousStock + parseInt(adjustment);
        
        // Ensure stock doesn't go negative
        if (product.stock < 0) {
            product.stock = 0;
        }
        
        // Add to stock history if you have this field
        if (!product.stockHistory) {
            product.stockHistory = [];
        }
        
        product.stockHistory.push({
            type: adjustment > 0 ? 'adjustment_increase' : 'adjustment_decrease',
            quantity: Math.abs(adjustment),
            previousStock,
            newStock: product.stock,
            reason,
            user: req.user._id,
            date: new Date()
        });
        
        await product.save();
        
        // Send notifications if stock was low
        if (product.stock <= 10) { // Assuming 10 is low stock threshold
            const io = req.app.get('io');
            const { createNotification } = require('../services/notificationService');
            
            // Notify relevant roles
            const users = await User.find({ 
                role: { $in: ['Admin', 'Accounting', 'Sales Manager', 'Inventory'] } 
            });
            
            for (const user of users) {
                await createNotification(io, {
                    recipient: user._id,
                    sender: req.user._id,
                    type: 'NEW_STOCK',
                    message: `Low stock alert: ${product.name} has only ${product.stock} units remaining`,
                    link: '/products/inventory-dashboard'
                });
            }
        }
        
        res.json({ success: true, message: 'Stock adjusted successfully' });
    } catch (error) {
        console.error('Error adjusting stock:', error);
        res.status(500).json({ success: false, message: 'Error adjusting stock' });
    }
});

module.exports = router;