const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

// Get user notifications
router.get('/', authenticate, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50', [req.user.id]);
        const unread = await pool.query('SELECT COUNT(*) FROM notifications WHERE user_id=$1 AND is_read=false', [req.user.id]);
        res.json({ success: true, notifications: result.rows, unread_count: parseInt(unread.rows[0].count) });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Mark as read
router.put('/:id/read', authenticate, async (req, res) => {
    try {
        await pool.query('UPDATE notifications SET is_read=true WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Mark all as read
router.put('/read/all', authenticate, async (req, res) => {
    try {
        await pool.query('UPDATE notifications SET is_read=true WHERE user_id=$1', [req.user.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
