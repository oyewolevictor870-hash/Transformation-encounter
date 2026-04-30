const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Initiate payment (dues or giving)
router.post('/initiate', authenticate, async (req, res) => {
    try {
        const { type, amount, project_id, month_year } = req.body;
        const reference = `TE-${uuidv4().slice(0, 8).toUpperCase()}`;
        const period = month_year || new Date().toISOString().slice(0, 7);
        await pool.query(
            'INSERT INTO payments (user_id, type, amount, reference, status, project_id, month_year) VALUES ($1,$2,$3,$4,$5,$6,$7)',
            [req.user.id, type, amount, reference, 'pending', project_id || null, period]
        );
        res.json({
            success: true,
            reference,
            paystack_public_key: process.env.PAYSTACK_PUBLIC_KEY || 'ADD_YOUR_PAYSTACK_KEY',
            email: req.user.email,
            amount: amount * 100
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Verify payment after Paystack callback
router.post('/verify', authenticate, async (req, res) => {
    try {
        const { reference } = req.body;
        const result = await pool.query('UPDATE payments SET status=$1, verified_at=NOW() WHERE reference=$2 AND user_id=$3 RETURNING *', ['successful', reference, req.user.id]);
        if (result.rows.length === 0) return res.status(400).json({ success: false, message: 'Payment not found.' });
        const payment = result.rows[0];
        if (payment.project_id) {
            await pool.query('UPDATE giving_projects SET collected_amount = collected_amount + $1 WHERE id=$2', [payment.amount, payment.project_id]);
        }
        res.json({ success: true, message: 'Payment verified.', payment });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get personal payment history
router.get('/history', authenticate, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM payments WHERE user_id=$1 ORDER BY created_at DESC', [req.user.id]);
        res.json({ success: true, payments: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get giving projects
router.get('/projects', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM giving_projects WHERE is_active=true ORDER BY created_at DESC');
        res.json({ success: true, projects: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Create giving project (admin)
router.post('/projects', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const { title, description, goal_amount, start_date, end_date } = req.body;
        const result = await pool.query(
            'INSERT INTO giving_projects (title, description, goal_amount, start_date, end_date, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
            [title, description, goal_amount, start_date, end_date, req.user.id]
        );
        res.status(201).json({ success: true, project: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get current dues setting
router.get('/dues/current', async (req, res) => {
    try {
        const period = new Date().toISOString().slice(0, 7);
        const result = await pool.query('SELECT * FROM dues_settings WHERE month_year=$1 ORDER BY created_at DESC LIMIT 1', [period]);
        res.json({ success: true, dues: result.rows[0] || { amount: 0 } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Tithe records (admin only)
router.get('/tithes', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT u.full_name, p.amount, p.month_year, p.created_at FROM payments p JOIN users u ON u.id=p.user_id WHERE p.type='tithe' AND p.status='successful' ORDER BY p.created_at DESC"
        );
        res.json({ success: true, tithes: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
