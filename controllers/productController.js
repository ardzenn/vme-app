const Product = require('../models/Product');
const StockItem = require('../models/StockItem');
const InventoryMovement = require('../models/InventoryMovement');
const fs = require('fs');
const csv = require('csv-parser');
const upload = require('../config/cloudinary');

const csvUpload = require('multer')({ dest: 'temp-csv/' });

exports.uploadProductImage = upload.single('productImage');
exports.uploadCsvFile = csvUpload.single('productCsv');

// MODIFIED: Now only finds ACTIVE products
exports.getProductGallery = async (req, res) => {
    try {
        const products = await Product.find({ isActive: true }).sort({ category: 1, name: 1 });
        res.render('product-gallery', { products });
    } catch (err) {
        req.flash('error_msg', 'Could not load product gallery.');
        res.redirect('/dashboard');
    }
};

// MODIFIED: Now only manages ACTIVE products
exports.getProductGallery = async (req, res) => {
    try {
        const products = await Product.find({ isActive: true }).sort({ category: 1, name: 1 });
        res.render('product-gallery', { products });
    } catch (err) {
        req.flash('error_msg', 'Could not load product gallery.');
        res.redirect('/dashboard');
    }
};

// MODIFIED: Now only manages ACTIVE products
exports.getManageProducts = async (req, res) => {
    try {
        const products = await Product.aggregate([
            {
                $match: { isActive: true } // Only get active products
            },
            {
                $lookup: {
                    from: 'stockitems',
                    localField: '_id',
                    foreignField: 'product',
                    as: 'inventory'
                }
            },
            {
                $addFields: {
                    totalStock: { $sum: '$inventory.quantityOnHand' }
                }
            },
            {
                $sort: { category: 1, name: 1 }
            }
        ]);
        res.render('manage-products', { products });
    } catch (err) {
        req.flash('error_msg', 'Could not load product management page.');
        res.redirect('/admin-dashboard');
    }
};

exports.addProduct = async (req, res) => {
    try {
        const { name, description, category, price, unit } = req.body;
        const newProductData = { name, description, category, price: parseFloat(price), unit };
        if (req.file) {
            newProductData.imageUrl = req.file.path;
        }
        const newProduct = new Product(newProductData);
        await newProduct.save();
        req.flash('success_msg', 'Product added successfully!');
        res.redirect('/products/inventory-dashboard'); // Redirect to inventory to see the new product
    } catch (err) {
        req.flash('error_msg', 'Failed to add product.');
        res.redirect('/products/inventory-dashboard');
    }
};

// RENAMED & MODIFIED: This function now archives the product instead of deleting it.
exports.toggleProductStatus = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (product) {
            product.isActive = !product.isActive; // Flip the status
            await product.save();
            req.flash('success_msg', `Product has been ${product.isActive ? 'restored' : 'archived'}.`);
        }
        res.redirect('/products/manage');
    } catch (err) {
        req.flash('error_msg', 'Failed to update product status.');
        res.redirect('/products/manage');
    }
};

// --- Inventory Functions (No Changes) ---
exports.getInventoryDetail = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            req.flash('error_msg', 'Product not found.');
            return res.redirect('/products/manage');
        }
        const stockItems = await StockItem.find({ product: req.params.id }).sort({ expirationDate: 1 });
        res.render('inventory-detail', { product, stockItems });
    } catch (err) {
        req.flash('error_msg', 'Could not load inventory details.');
        res.redirect('/products/manage');
    }
};
exports.importProducts = (req, res) => {
    if (!req.file) {
        req.flash('error_msg', 'Please upload a CSV file.');
        return res.redirect('/products/manage');
    }

    const results = [];
    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            try {
                const productsToInsert = results.map(row => ({
                    name: row.Name,
                    description: row.Description,
                    category: row.Category,
                    price: parseFloat(row.Price),
                    unit: row.Unit || 'pcs',
                    imageUrl: row.ImageUrl
                }));
                await Product.insertMany(productsToInsert, { ordered: false });
                req.flash('success_msg', `${results.length} products imported successfully.`);
            } catch (err) {
                 req.flash('error_msg', 'An error occurred during bulk import. Check CSV format.');
            } finally {
                fs.unlinkSync(req.file.path);
                res.redirect('/products/manage');
            }
        });
};
exports.receiveStock = async (req, res) => {
    const { id } = req.params;
    const { batchNumber, expirationDate, quantity, location, notes } = req.body;
    const quantityNum = parseInt(quantity, 10);

    try {
        if (quantityNum <= 0) {
            throw new Error('Quantity must be a positive number.');
        }

        // Get product info for notification
        const product = await Product.findById(id);
        if (!product) {
            throw new Error('Product not found.');
        }

        const stockItem = await StockItem.findOneAndUpdate(
            { product: id, batchNumber, location },
            { 
                $inc: { quantityOnHand: quantityNum },
                $set: { expirationDate }
            },
            { new: true, upsert: true, runValidators: true }
        );

        await InventoryMovement.create({
            product: id,
            stockItem: stockItem._id,
            type: 'Stock In',
            quantity: quantityNum,
            user: req.user.id,
            notes
        });

        // Send notifications to relevant roles
        const io = req.app.get('io');
        const { createNotificationsForGroup, getFinanceAndAdminIds } = require('../services/notificationService');
        
        const recipients = await getFinanceAndAdminIds(); // Admin, Accounting, Sales Manager, Inventory, IT
        await createNotificationsForGroup(io, {
            recipients,
            sender: req.user._id,
            type: 'NEW_STOCK',
            message: `New stock received: ${quantityNum} units of ${product.name} (Batch: ${batchNumber})`,
            link: `/products/inventory/${id}`
        });

        req.flash('success_msg', `${quantityNum} units of batch ${batchNumber} received successfully!`);
        res.redirect(`/products/inventory/${id}`);
    } catch (err) {
        console.error("Receive Stock Error:", err);
        req.flash('error_msg', `Failed to receive stock: ${err.message}`);
        res.redirect(`/products/inventory/${id}`);
    }
};

// --- THIS IS THE MAIN FUNCTION TO UPDATE ---
exports.getInventoryDashboard = async (req, res) => {
    try {
        const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        const products = await Product.aggregate([
            {
                $lookup: {
                    from: 'stockitems',
                    localField: '_id',
                    foreignField: 'product',
                    as: 'stockItems'
                }
            },
            {
                $addFields: {
                    totalStock: { $sum: '$stockItems.quantityOnHand' },
                    // FIXED: Added a new field to count expiring items directly
                    expiringSoonCount: {
                        $size: {
                            $filter: {
                                input: '$stockItems',
                                as: 'item',
                                cond: {
                                    $and: [
                                        { $ne: ['$$item.expirationDate', null] },
                                        { $lte: ['$$item.expirationDate', thirtyDaysFromNow] }
                                    ]
                                }
                            }
                        }
                    }
                }
            },
            {
                $sort: { totalStock: 1, name: 1 }
            }
        ]);

        const recentMovements = await InventoryMovement.find()
            .populate('product', 'name')
            .populate('user', 'firstName lastName')
            .sort({ createdAt: -1 })
            .limit(20);

        res.render('inventory-dashboard', {
            inventoryData: products,
            recentMovements,
            user: req.user
        });
    } catch (error) {
        console.error('Error loading inventory dashboard:', error);
        req.flash('error_msg', 'Error loading inventory dashboard');
        res.redirect('/dashboard');
    }
};
// Adjust stock levels
exports.adjustStock = async (req, res) => {
    const { id } = req.params;
    const { stockItemId, adjustment, reason } = req.body;
    const adjustmentNum = parseInt(adjustment, 10);

    try {
        const stockItem = await StockItem.findById(stockItemId);
        if (!stockItem) {
            throw new Error('Stock item not found.');
        }

        const newQuantity = stockItem.quantityOnHand + adjustmentNum;
        if (newQuantity < 0) {
            throw new Error('Adjustment would result in negative stock.');
        }

        stockItem.quantityOnHand = newQuantity;
        await stockItem.save();

        await InventoryMovement.create({
            product: id,
            stockItem: stockItemId,
            type: 'Adjustment',
            quantity: adjustmentNum,
            user: req.user.id,
            notes: reason
        });

        req.flash('success_msg', 'Stock adjustment completed successfully.');
        res.redirect(`/products/inventory/${id}`);
    } catch (err) {
        console.error("Stock Adjustment Error:", err);
        req.flash('error_msg', `Failed to adjust stock: ${err.message}`);
        res.redirect(`/products/inventory/${id}`);
    }
};

// Enhanced product gallery with stock visibility
exports.getProductGallery = async (req, res) => {
    try {
        const products = await Product.find({ isActive: true }).sort({ name: 1 });
        
        // Add stock information for authorized roles
        let productsWithStock = products;
        if (['Admin', 'Accounting', 'Sales Manager', 'Inventory'].includes(req.user.role)) {
            productsWithStock = [];
            
            for (const product of products) {
                const stockItems = await StockItem.find({ product: product._id });
                const totalStock = stockItems.reduce((sum, stock) => sum + stock.quantityOnHand, 0);
                
                productsWithStock.push({
                    ...product.toObject(),
                    totalStock,
                    stockStatus: totalStock === 0 ? 'out-of-stock' : totalStock < 10 ? 'low-stock' : 'in-stock'
                });
            }
        }

        res.render('products', { 
            products: productsWithStock,
            showStock: ['Admin', 'Accounting', 'Sales Manager', 'Inventory'].includes(req.user.role),
            currentUser: req.user
        });
    } catch (err) {
        console.error('Error loading product gallery:', err);
        req.flash('error_msg', 'Could not load products.');
        res.redirect('/dashboard');
    }
};