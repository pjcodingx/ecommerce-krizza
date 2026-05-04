// 1. Import the Express library
const express = require('express');
// 2. Create a new router object
const router = express.Router();

// 3. Import the controller we just created
const productController = require('../controllers/productController');

// 4. Define the route
router.get('/', productController.getAllProducts);

// 5. Export the router to be used in our main server file
module.exports = router;