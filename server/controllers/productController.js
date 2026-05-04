// 1. Import the database connection we configured in server.js
const db = require('../config/db');

// 2. Define and export the function to get all products
exports.getAllProducts = (req, res) => {
    // 3. Define the SQL query to select everything from the products table
    const sql = "SELECT * FROM products";

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
};// This file will contain the logic for handling product-related requests.
