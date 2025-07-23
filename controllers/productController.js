// in controllers/productController.js
const Product = require('../models/Product');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');


// --- Multer Configuration for Product Images ---
const storage = multer.diskStorage({
    destination: './public/uploads/products/',
    filename: function (req, file, cb) {
        cb(null, `product-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage: storage });

exports.uploadProductImage = upload.single('productImage');

// --- Views ---
// For MSR/KAS to view the gallery
exports.getProductGallery = async (req, res) => {
    try {
        const products = await Product.find().sort({ category: 1, name: 1 });
        res.render('product-gallery', { products });
    } catch (err) {
        req.flash('error_msg', 'Could not load product gallery.');
        res.redirect('/dashboard');
    }
};

// For Admin/Accounting to manage products
exports.getManageProducts = async (req, res) => {
    try {
        const products = await Product.find().sort({ category: 1, name: 1 });
        res.render('manage-products', { products });
    } catch (err) {
        req.flash('error_msg', 'Could not load product management page.');
        res.redirect('/admin-dashboard');
    }
};

// --- API Logic ---
exports.createProduct = async (req, res) => {
    try {
        const { name, description, category } = req.body;
        if (!req.file) {
            req.flash('error_msg', 'Product image is required.');
            return res.redirect('/products/manage');
        }
        const newProduct = new Product({
            name,
            description,
            category,
            imageUrl: `/uploads/products/${req.file.filename}`
        });
        await newProduct.save();
        req.flash('success_msg', 'Product added successfully.');
        res.redirect('/products/manage');
    } catch (err) {
        req.flash('error_msg', 'Failed to add product.');
        res.redirect('/products/manage');
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        req.flash('success_msg', 'Product deleted successfully.');
        res.redirect('/products/manage');
    } catch (err) {
        req.flash('error_msg', 'Failed to delete product.');
        res.redirect('/products/manage');
    }
};

// This is for to upload many files
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
                await Product.insertMany(results, { ordered: false });
                fs.unlinkSync(req.file.path); // Clean up the uploaded file
                req.flash('success_msg', `${results.length} products imported successfully.`);
                res.redirect('/products/manage');
            } catch (err) {
                fs.unlinkSync(req.file.path);
                req.flash('error_msg', 'Error importing products. Please check your CSV file format.');
                res.redirect('/products/manage');
            }
        });
};