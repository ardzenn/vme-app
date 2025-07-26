const Product = require('../models/Product');
const fs = require('fs');
const csv = require('csv-parser');
const upload = require('../config/cloudinary');

const csvUpload = require('multer')({ dest: 'temp-csv/' });

exports.uploadProductImage = upload.single('productImage');
exports.uploadCsvFile = csvUpload.single('productCsv');

exports.getProductGallery = async (req, res) => {
    try {
        const products = await Product.find().sort({ category: 1, name: 1 });
        res.render('product-gallery', { products });
    } catch (err) {
        req.flash('error_msg', 'Could not load product gallery.');
        res.redirect('/dashboard');
    }
};

exports.getManageProducts = async (req, res) => {
    try {
        const products = await Product.find().sort({ category: 1, name: 1 });
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
                    imageUrl: row.ImageUrl // Assuming ImageUrl is in the CSV
                }));
                await Product.insertMany(productsToInsert, { ordered: false });
                req.flash('success_msg', `${results.length} products imported successfully.`);
            } catch (err) {
                 req.flash('error_msg', 'An error occurred during bulk import. Check CSV format and required fields.');
            } finally {
                fs.unlinkSync(req.file.path);
                res.redirect('/products/manage');
            }
        });
};