const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const rentalBookingController = require('../controllers/rentalBookingController');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const targetDir = path.join(__dirname, '../../client/public/uploads/rentals/receipts');
    fs.mkdirSync(targetDir, { recursive: true });
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`);
  }
});

const upload = multer({ storage });

router.get('/rental-cameras/:id/availability', rentalBookingController.getCameraAvailability);
router.post('/rentals/checkout', upload.single('reservationReceipt'), rentalBookingController.checkoutRental);
router.get('/rentals/:bookingCode', rentalBookingController.getRentalByCode);
router.get('/admin/rentals', rentalBookingController.getAdminRentals);
router.put('/admin/rentals/:bookingCode/confirm', rentalBookingController.confirmRental);

module.exports = router;
