const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { jwtSecret, jwtExpiry } = require('../config/config');
const { authenticate, requireRole } = require('../middleware/auth');
const { sendEmail } = require('../jobs/mailer');

// Register
router.post('/register', async (req, res) => {
    try {
        const { full_name, email, password, phone, birthday, whatsapp_number } = req.body;
        if (!full_name || !email || !password) return res.status(400).json({ success: false, message: 'Name, email and password are required.' });

        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) return res.status(400).json({ success: false, message: 'Email already registered.' });

        const hashed = await bcrypt.hash(password, 12);
        const result = await pool.query(
            `INSERT INTO users (full_name, email, password, phone, birthday, whatsapp_number, role, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'pending', 'pending') RETURNING id, full_name, email`,
            [full_name, email, hashed, phone || null, birthday || null, whatsapp_number || null]
        );

        const admins = await pool.query("SELECT email FROM users WHERE role = 'admin'");
        for (const admin of admins.rows) {
            await sendEmail(admin.email, 'New Member Registration', `${full_name} has registered and is awaiting approval.`);
        }

        res.status(201).json({ success: true, message: 'Registration submitted. Awaiting admin approval.', user: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Registration failed. Try again.' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required.' });

        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) return res.status(401).json({ success: false, message: 'Invalid credentials.' });

        const user = result.rows[0];
        if (user.status === 'pending') return res.status(403).json({ success: false, message: 'Account pending admin approval.' });
        if (user.status === 'suspended') return res.status(403).json({ success: false, message: 'Account suspended. Contact admin.' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials.' });

        await pool.query('UPDATE users SET last_active = NOW() WHERE id = $1', [user.id]);

        const token = jwt.sign({ id: user.id, role: user.role }, jwtSecret, { expiresIn: jwtExpiry });
        const { password: _, ...userData } = user;

        res.json({ success: true, token, user: userData });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Login failed. Try again.' });
    }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, full_name, email, phone, role, status, profile_photo, bio, birthday, salvation_date, department, dark_mode, onboarding_complete, created_at FROM users WHERE id = $1',
            [req.user.id]
        );
        res.json({ success: true, user: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error fetching profile.' });
    }
});

// Change password
router.put('/change-password', authenticate, async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        const result = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
        const match = await bcrypt.compare(current_password, result.rows[0].password);
        if (!match) return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
        const hashed = await bcrypt.hash(new_password, 12);
        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, req.user.id]);
        res.json({ success: true, message: 'Password changed successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error changing password.' });
    }
});

module.exports = router;
