// 1. Import the database connection we configured in server.js
const db = require('../config/db');

// 2. Define and export the function to get all products
exports.getAllProducts = (req, res) => {
    // 3. Define the SQL query to select everything from the products table
    const sql = "SELECT * FROM products ORDER BY createdAt DESC";

    // 4. Execute the query using the database connection
    db.query(sql, (err, results) => {
        // 5. Error handling: if the query fails, send a server error
        if (err) {
            console.error('Error fetching products: ' + err.stack);
            res.status(500).send('Error fetching products from database');
            return;
        }
        // 6. Success: if the query is successful, send the results as JSON
        res.status(200).json(results);
    });
};

exports.createProduct = (req, res) => {
    console.log('req.body:', req.body);
    console.log('req.file:', req.file);
    const body = req.body || {};
    const { name, category, price, stock, description } = body;
    
    // Use the uploaded file's path relative to the public directory
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    if (!name || !category || price === undefined || price === '' || stock === undefined || stock === '') {
        console.error('Validation failed', req.body);
        return res.status(400).json({ message: 'Name, category, price, and stock are required.' });
    }

    const sql = "INSERT INTO products (name, category, price, stock, description, imageUrl, type) VALUES (?, ?, ?, ?, ?, ?, 'For Sale')";
    
    db.query(sql, [name, category, price, stock, description, imageUrl], (err, result) => {
        if (err) {
            console.error('Error creating product: ', err);
            return res.status(500).json({ message: 'Error creating product. Database connection issue?' });
        }
        res.status(201).json({ message: 'Product created successfully!', id: result.insertId });
    });
};

// This file will contain the logic for handling product-related requests.
