const express = require('express');
const db = require('./config/db');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Add this to parse incoming urlencoded bodies 

// Serve static files (uploads)
app.use(express.static(path.join(__dirname, '../client/public')));

// Import routers
const productRoutes = require('./routes/productRoutes');
const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const rentalCameraRoutes = require('./routes/rentalCameraRoutes');
const rentalBookingRoutes = require('./routes/rentalBookingRoutes');

// Use routers
app.use('/api/products', productRoutes);
app.use('/api/admin', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api', announcementRoutes);
app.use('/api', rentalCameraRoutes);
app.use('/api', rentalBookingRoutes);



db.getConnection((err, connection) => {
    if (err) {
        console.error('Database connection failed: ' + err.stack);
        return;
    }
    console.log('Connected to database.');
    if (connection) connection.release();
});

db.query(`
    CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        orderCode VARCHAR(50) NOT NULL UNIQUE,
        customerName VARCHAR(255) NOT NULL,
        messenger VARCHAR(255) NOT NULL,
        paymentMethod VARCHAR(20) NOT NULL,
        receiptFileName VARCHAR(255),
        receiptUrl VARCHAR(255),
        agreedToTerms TINYINT(1) NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        totalAmount DECIMAL(10,2) NOT NULL DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`, (err) => {
    if (err) {
        console.error('Failed creating orders table:', err);
    }
});

db.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS receiptUrl VARCHAR(255)", (err) => {
    if (err) console.error('Failed adding receiptUrl column:', err);
});

db.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'PENDING'", (err) => {
    if (err) console.error('Failed adding status column:', err);
});

db.query(`
    CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        orderId INT NOT NULL,
        productId INT,
        productName VARCHAR(255) NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        unitPrice DECIMAL(10,2) NOT NULL DEFAULT 0,
        subtotal DECIMAL(10,2) NOT NULL DEFAULT 0
    )
`, (err) => {
    if (err) {
        console.error('Failed creating order_items table:', err);
    }
});

db.query(`
    CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL
    )
`, (err) => {
    if (err) {
        console.error('Failed creating admins table:', err);
    } else {
        // Insert default admin if it doesn't exist
        db.query("SELECT * FROM admins WHERE username = 'admin'", (err, results) => {
            if (!err && results.length === 0) {
                db.query("INSERT INTO admins (username, password) VALUES ('admin', 'admin123')");
            }
        });
    }
});

app.get('/', (req, res) => {
    res.send('Welcome to Krizza Shop API');
});



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
