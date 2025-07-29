const Order = require('../models/Order');
const Message = require('../models/Message');
const crypto = require('crypto');
const upload = require('../config/cloudinary');
const { createNotification, createNotificationsForGroup, getAdminAndITIds, getFinanceAndAdminIds } = require('../services/notificationService');

exports.uploadAttachment = upload.single('attachment');

exports.bookOrder = async (req, res) => {
    try {
        const { customerName, email, contactNumber, hospital, area, note, products, subtotal } = req.body;
        
        if (!products || !Array.isArray(products) || products.length === 0) {
            req.flash('error_msg', 'Cannot book an order with no products.');
            return res.redirect('/bookorder');
        }

        const processedProducts = products.map(p => ({
            product: p.product,
            quantity: parseFloat(p.quantity) || 0,
            unit: p.unit,
            price: parseFloat(p.price) || 0,
            total: (parseFloat(p.quantity) || 0) * (parseFloat(p.price) || 0)
        }));

        const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
        const reference = `VME-${Date.now()}-${randomSuffix}`;
        
        const newOrderData = {
            user: req.user.id, customerName, email, contactNumber, hospital, area, note,
            products: processedProducts, 
            subtotal: parseFloat(subtotal) || 0, 
            reference
        };

        if (req.file) {
            newOrderData.attachment = req.file.path;
        }

        const newOrder = new Order(newOrderData);
        await newOrder.save();
        
        // --- Create Notifications ---
        const io = req.app.get('io');
        const financeUsers = await getFinanceAndAdminIds();
        const notificationText = `${req.user.firstName} ${req.user.lastName} booked a new sales order (#${reference}).`;
        const notificationLink = `/admin-dashboard`; // Or a future specific order link
        await createNotificationsForGroup(io, financeUsers, notificationText, notificationLink);

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
        const order = await Order.findByIdAndUpdate(req.params.id, { salesInvoice, status, paymentStatus });

        // Notify the original user that their order was updated
        if (order && order.user.toString() !== req.user.id.toString()) {
            const io = req.app.get('io');
            const notificationText = `Your order #${order.reference} status was updated to "${status}".`;
            await createNotification(io, order.user, notificationText, `/dashboard`);
        }

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
                populate: { path: 'sender', select: 'firstName lastName profilePicture' }
            });
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        res.json({ order, currentUser: req.user });
    } catch (err) {
        res.status(500).json({ message: 'Could not retrieve order details.' });
    }
};

exports.addMessageToOrder = async (req, res) => {
    try {
        const { text } = req.body;
        const orderId = req.params.id;
        
        const message = new Message({
            order: orderId,
            sender: req.user.id,
            text: text,
            attachment: req.file ? req.file.path : null 
        });
        await message.save();

        const order = await Order.findByIdAndUpdate(orderId, { $push: { messages: message._id } });
        
        const populatedMessage = await Message.findById(message._id).populate('sender', 'firstName lastName profilePicture');
        
        const io = req.app.get('io');
        io.to(`order_${orderId}`).emit('newOrderMessage', populatedMessage);
        
        // --- Create Notification for other participants ---
        const recipientIds = order.participants.filter(pId => pId.toString() !== req.user.id.toString());
        const notificationText = `${req.user.firstName} commented on order #${order.reference}.`;
        const notificationLink = `/admin-dashboard`; // Link should ideally open the order modal
        await createNotificationsForGroup(io, recipientIds, notificationText, notificationLink);

        res.json({ success: true, message: populatedMessage });
    } catch (err) {
        console.error("Add message error:", err);
        res.status(500).json({ success: false, message: 'Failed to send message.' });
    }
};