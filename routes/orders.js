const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { ensureAuthenticated, ensureAccounting } = require('../middleware/auth');

router.post('/book', ensureAuthenticated, orderController.uploadAttachment, orderController.bookOrder);
router.get('/:id', ensureAuthenticated, orderController.getOrderDetailsAndMessages);
router.post('/:id/attach', ensureAuthenticated, orderController.uploadAttachment, orderController.addAttachment);

// --- NEW ROUTE ---
// Defines the endpoint for uploading chat attachments. It uses the same multer middleware.
router.post('/:id/messages/attach', ensureAuthenticated, orderController.uploadAttachment, orderController.attachFileToMessage);
router.post('/:id/update', ensureAuthenticated, ensureAccounting, orderController.updateOrder);

module.exports = router;
