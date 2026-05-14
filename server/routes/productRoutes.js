// 1. Import the Express library
const express = require('express');
const multer = require('multer');
const path = require('path');
// 2. Create a new router object
const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../client/public/uploads/'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// 3. Import the controller we just created
const productController = require('../controllers/productController');

// 4. Define the route
router.get('/', productController.getAllProducts);
router.post('/', upload.single('image'), productController.createProduct);

// 5. Export the router to be used in our main server file
module.exports = router;