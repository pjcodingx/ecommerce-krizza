const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const orderController = require('../controllers/orderController');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const receiptDir = path.join(__dirname, '../../client/public/uploads/receipts/');
    fs.mkdirSync(receiptDir, { recursive: true });
    cb(null, receiptDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`);
  }
});

const upload = multer({ storage });

router.get('/', orderController.getAllOrders);
router.post('/', upload.single('receipt'), orderController.createOrder);
router.put('/:orderCode/confirm', orderController.confirmOrder);
router.delete('/:orderCode', orderController.deleteOrder);

module.exports = router;
