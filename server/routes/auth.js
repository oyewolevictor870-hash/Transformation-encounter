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
// Forgot Password
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });
        const result = await pool.query('SELECT id, full_name FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) return res.json({ success: true, message: 'If that email is registered, a reset link has been sent.' });
        const user = result.rows[0];
        const crypto = require('crypto');
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 60 * 60 * 1000);
        await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);
        await pool.query('INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.id, token, expires]);
        const appUrl = process.env.APP_URL || 'https://transformation-encounter.vercel.app';
        const resetLink = `${appUrl}/reset-password.html?token=${token}`;
        await sendEmail(
            email,
            'Reset Your Password — Transformation Encounter',
            `Hi ${user.full_name},\n\nClick this link to reset your password (expires in 1 hour):\n${resetLink}\n\nIf you did not request this, ignore this email.`,
            `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px">
              <div style="text-align:center;margin-bottom:24px"><span style="font-size:40px">🔥</span><h2 style="color:#1A0F45;margin:8px 0">Transformation Encounter</h2></div>
              <p>Hi <strong>${user.full_name}</strong>,</p>
              <p>We received a request to reset your password. Click the button below — this link expires in <strong>1 hour</strong>.</p>
              <div style="text-align:center;margin:32px 0"><a href="${resetLink}" style="background:#1A0F45;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">Reset My Password</a></div>
              <p style="color:#888;font-size:12px">If you did not request this, you can safely ignore this email.</p>
              <p style="color:#aaa;font-size:11px;text-align:center;margin-top:24px">Transformation Encounter Ministry Portal</p>
            </div>`
        );
        res.json({ success: true, message: 'If that email is registered, a reset link has been sent.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error processing request.' });
    }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
    try {
        const { token, new_password } = req.body;
        if (!token || !new_password) return res.status(400).json({ success: false, message: 'Token and new password are required.' });
        if (new_password.length < 8) return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
        const result = await pool.query(
            'SELECT * FROM password_reset_tokens WHERE token = $1 AND used = FALSE AND expires_at > NOW()', [token]
        );
        if (result.rows.length === 0) return res.status(400).json({ success: false, message: 'Reset link is invalid or has expired.' });
        const resetToken = result.rows[0];
        const hashed = await bcrypt.hash(new_password, 12);
        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, resetToken.user_id]);
        await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [resetToken.id]);
        res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error resetting password.' });
    }
});

module.exports = router;
