const express = require('express');
const router = express.Router();
const db = require('../config/db');

// POST /api/admin/login
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    const query = 'SELECT * FROM admins WHERE username = ? AND password = ?';
    db.query(query, [username, password], (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }

        if (results.length > 0) {
            // Simplified login success (using simple local state or token if we had one)
            // For security, you should hash passwords and return a JWT hook here.
            res.json({ message: 'Login successful', adminId: results[0].id });
        } else {
            res.status(401).json({ message: 'Invalid username or password' });
        }
    });
});

module.exports = router;
