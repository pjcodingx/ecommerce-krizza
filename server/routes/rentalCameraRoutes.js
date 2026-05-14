const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const rentalCameraController = require('../controllers/rentalCameraController');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = file.fieldname === 'coverImage' ? 'covers' : 'samples';
    const targetDir = path.join(__dirname, `../../client/public/uploads/rentals/${folder}`);
    fs.mkdirSync(targetDir, { recursive: true });
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`);
  }
});

const upload = multer({ storage });

router.get('/rental-cameras', rentalCameraController.getPublicRentalCameras);
router.get('/admin/rental-cameras', rentalCameraController.getAdminRentalCameras);
router.post(
  '/admin/rental-cameras',
  upload.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'sampleShots', maxCount: 20 }
  ]),
  rentalCameraController.createRentalCamera
);
router.put(
  '/admin/rental-cameras/:id',
  upload.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'sampleShots', maxCount: 20 }
  ]),
  rentalCameraController.updateRentalCamera
);
router.delete('/admin/rental-cameras/:id', rentalCameraController.deleteRentalCamera);

module.exports = router;
