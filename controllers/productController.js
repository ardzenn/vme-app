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
        res.redirect('/products/manage');
    } catch (err) {
        req.flash('error_msg', 'Failed to add product.');
        res.redirect('/products/manage');
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

exports.receiveStock = async (req, res) => {
    const { id } = req.params;
    const { batchNumber, expirationDate, quantity, location, notes } = req.body;
    const quantityNum = parseInt(quantity, 10);

    try {
        if (quantityNum <= 0) {
            throw new Error('Quantity must be a positive number.');
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
        req.flash('success_msg', `${quantityNum} units of batch ${batchNumber} received successfully!`);
        res.redirect(`/products/inventory/${id}`);
    } catch (err) {
        console.error("Receive Stock Error:", err);
        req.flash('error_msg', `Failed to receive stock: ${err.message}`);
        res.redirect(`/products/inventory/${id}`);
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