const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { ensureAuthenticated } = require('../middleware/auth');

// Handles the submission of the "Book New Order" form
router.post('/book', 
    ensureAuthenticated, 
    orderController.uploadAttachment, 
    orderController.bookOrder
);

// Handles updates to an order from the Accounting/Admin modal
router.post('/:id/update', 
    ensureAuthenticated, 
    orderController.updateOrder
);

// Handles adding a message to an order's communication thread
router.post('/:id/messages', 
    ensureAuthenticated, 
    orderController.uploadAttachment, 
    orderController.addMessageToOrder
);

module.exports = router;