const Order = require('../models/Order');
const Message = require('../models/Message'); // Make sure to require the Message model
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');

// --- Multer Configuration for Attachments ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // This function dynamically sets the destination folder based on the URL
        let dest = './public/uploads/others/';
        if (req.originalUrl.includes('/book') || req.originalUrl.includes('/attach')) {
            dest = './public/uploads/orders/';
        } else if (req.originalUrl.includes('/messages/attach')) {
            // IMPORTANT: Create a 'chat' folder in 'public/uploads'
            dest = './public/uploads/chat/'; 
        }
        cb(null, dest);
    },
    filename: function (req, file, cb) {
        cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage: storage, limits: { fileSize: 10000000 } }); // 10MB Limit

exports.uploadAttachment = upload.single('attachment');

// --- Controller Functions ---

exports.bookOrder = async (req, res) => {
    try {
        const { customerName, email, contactNumber, hospital, area, note, products } = req.body;
        const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
        const reference = `VME-${Date.now()}-${randomSuffix}`;
        let subtotal = 0;
        const processedProducts = products ? Object.values(products).map(p => {
            const total = (p.quantity || 0) * (p.price || 0);
            subtotal += total;
            return { ...p, total };
        }) : [];
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
        req.flash('error_msg', 'Failed to book the order. Please try again.');
        res.redirect('/bookorder');
    }
};

exports.getOrderDetailsAndMessages = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'firstName lastName role')
            .populate({
                path: 'messages',
                populate: { path: 'user', select: 'firstName lastName profilePicture' }
            });
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        res.json({ order, messages: order.messages, currentUser: req.user });
    } catch (err) {
        console.error("Get order details error:", err);
        res.status(500).json({ message: 'Could not retrieve order details.' });
    }
};

exports.addAttachment = async (req, res) => {
    try {
        if (!req.file) {
            req.flash('error_msg', 'Please select a file to attach.');
            return res.redirect('back');
        }
        const orderId = req.params.id;
        const attachmentPath = `/uploads/orders/${req.file.filename}`;
        await Order.findByIdAndUpdate(orderId, { attachment: attachmentPath });
        req.flash('success_msg', 'Attachment added successfully.');
        res.redirect('/dashboard');
    } catch (err) {
        console.error("Add attachment error:", err);
        req.flash('error_msg', 'Failed to add attachment.');
        res.redirect('/dashboard');
    }
};

// --- NEW FUNCTION ---
// Handles uploading a file from the chatbox.
exports.attachFileToMessage = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file was uploaded.' });
    }
    // Return the URL of the saved file to the client
    const fileUrl = `/uploads/chat/${req.file.filename}`;
    res.json({ success: true, url: fileUrl });
};
