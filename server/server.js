const express = require('express');
const db = require('./config/db');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Import the router we created
const productRoutes = require('./routes/productRoutes');

// Use the router for any request that starts with /api/products
app.use('/api/products', productRoutes);



db.connect(err => {
    if (err) {
        console.error('Database connection failed: ' + err.stack);
        return;
    }
    console.log('Connected to database.');
});

app.get('/', (req, res) => {
    res.send('Welcome to Krizza Shop API');
});



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
