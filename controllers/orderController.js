const Order = require('../models/Order');
const Message = require('../models/Message');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');

// --- Multer Configuration for Attachments --- 
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let dest = './public/uploads/others/';
        if (req.originalUrl.includes('/book')) {
            dest = './public/uploads/orders/';
        } else if (req.originalUrl.includes('/messages/attach')) {
            dest = './public/uploads/chat/'; 
        }
        cb(null, dest);
    },
    filename: function (req, file, cb) {
        cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage: storage });
exports.uploadAttachment = upload.single('attachment');

// --- Controller Functions ---

exports.bookOrder = async (req, res) => {
    try {
        const { customerName, email, contactNumber, hospital, area, note, product, quantity, price } = req.body;
        
        // --- CORRECTED PRODUCT & SUBTOTAL LOGIC ---
        let processedProducts = [];
        let subtotal = 0;

        if (Array.isArray(product)) {
            // Handle multiple products
            for (let i = 0; i < product.length; i++) {
                const q = parseFloat(quantity[i]) || 0;
                const p = parseFloat(price[i]) || 0;
                const total = q * p;
                if (product[i]) { // Only add if product name is not empty
                    processedProducts.push({
                        product: product[i],
                        quantity: q,
                        price: p,
                        total: total
                    });
                    subtotal += total;
                }
            }
        } else if (product) { 
            // Handle case with only one product
            const q = parseFloat(quantity) || 0;
            const p = parseFloat(price) || 0;
            const total = q * p;
            processedProducts.push({ product, quantity: q, price: p, total });
            subtotal = total;
        }

        const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
        const reference = `VME-${Date.now()}-${randomSuffix}`;
        
        const newOrderData = {
            user: req.user.id, customerName, email, contactNumber, hospital, area, note,
            products: processedProducts, subtotal, reference
        };

        if (req.file) {
            newOrderData.attachment = `/uploads/orders/${req.file.filename}`;
        }

        const newOrder = new Order(newOrderData);
        await newOrder.save();
        req.flash('success_msg', `Order #${reference} has been successfully booked!`);
        res.redirect('/dashboard');

    } catch (err) {
        console.error("Order booking error:", err);
        req.flash('error_msg', 'Failed to book the order. Please check all fields and try again.');
        res.redirect('/bookorder');
    }
};

exports.updateOrder = async (req, res) => {
    try {
        const { salesInvoice, status, paymentStatus } = req.body;
        await Order.findByIdAndUpdate(req.params.id, { salesInvoice, status, paymentStatus });
        req.flash('success_msg', 'Order updated successfully!');
        res.redirect('back');
    } catch (err) {
        req.flash('error_msg', 'Failed to update order.');
        res.redirect('back');
    }
};

exports.getOrderDetailsAndMessages = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'firstName lastName role profilePicture')
            .populate({
                path: 'messages',
                populate: { path: 'user', select: 'firstName lastName profilePicture' }
            });
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        res.json({ order, messages: order.messages, currentUser: req.user });
    } catch (err) {
        res.status(500).json({ message: 'Could not retrieve order details.' });
    }
};

exports.addMessageToOrder = async (req, res) => {
    try {
        const { text } = req.body;
        const orderId = req.params.id;
        
        const message = new Message({
            user: req.user.id,
            text: text,
            attachment: req.file ? `/uploads/orders/${req.file.filename}` : null
        });
        await message.save();

        await Order.findByIdAndUpdate(orderId, { $push: { messages: message._id } });
        
        const populatedMessage = await Message.findById(message._id).populate('user', 'firstName lastName profilePicture');
        
        res.json({ success: true, message: populatedMessage });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to send message.' });
    }
};

exports.attachFileToMessage = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file was uploaded.' });
    }
    const fileUrl = `/uploads/chat/${req.file.filename}`;
    res.json({ success: true, url: fileUrl });
};
