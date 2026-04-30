const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, requireRole, logWorkerAction } = require('../middleware/auth');
const { sendNotificationToAll } = require('../jobs/notifications');

// Get all prayer requests (public wall)
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT pr.*, CASE WHEN pr.is_anonymous THEN 'Anonymous' ELSE u.full_name END as requester_name,
            (SELECT COUNT(*) FROM prayer_intercessions WHERE prayer_id = pr.id) as prayer_count
            FROM prayer_requests pr LEFT JOIN users u ON u.id = pr.user_id
            WHERE pr.is_public = true AND pr.status = 'active' ORDER BY pr.is_emergency DESC, pr.created_at DESC`
        );
        res.json({ success: true, prayers: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Submit prayer request
router.post('/', authenticate, async (req, res) => {
    try {
        const { title, content, is_public, is_anonymous } = req.body;
        const result = await pool.query(
            'INSERT INTO prayer_requests (user_id, title, content, is_public, is_anonymous) VALUES ($1,$2,$3,$4,$5) RETURNING *',
            [req.user.id, title, content, is_public !== false, is_anonymous || false]
        );
        res.status(201).json({ success: true, prayer: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Pray for a request (I am praying)
router.post('/:id/pray', authenticate, async (req, res) => {
    try {
        const { message } = req.body;
        const existing = await pool.query('SELECT id FROM prayer_intercessions WHERE prayer_id=$1 AND user_id=$2', [req.params.id, req.user.id]);
        if (existing.rows.length > 0) return res.json({ success: true, message: 'Already praying.' });
        await pool.query('INSERT INTO prayer_intercessions (prayer_id, user_id, message) VALUES ($1,$2,$3)', [req.params.id, req.user.id, message || null]);
        res.json({ success: true, message: 'Added to prayer.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Emergency prayer alert (workers/admin)
router.post('/emergency', authenticate, requireRole('worker', 'admin'), async (req, res) => {
    try {
        const { title, content } = req.body;
        await pool.query(
            'INSERT INTO prayer_requests (user_id, title, content, is_public, is_emergency) VALUES ($1,$2,$3,true,true)',
            [req.user.id, title, content]
        );
        await sendNotificationToAll('emergency_prayer', '🚨 URGENT PRAYER REQUEST', title);
        await logWorkerAction(req.user.id, 'EMERGENCY_PRAYER_ALERT', title);
        res.json({ success: true, message: 'Emergency prayer alert sent to all.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Workers: get all prayer requests including private
router.get('/all', authenticate, requireRole('worker', 'admin'), async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT pr.*, u.full_name as requester_name, u.email,
            (SELECT COUNT(*) FROM prayer_intercessions WHERE prayer_id=pr.id) as prayer_count
            FROM prayer_requests pr LEFT JOIN users u ON u.id=pr.user_id ORDER BY pr.is_emergency DESC, pr.created_at DESC`
        );
        res.json({ success: true, prayers: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Mark as answered
router.put('/:id/status', authenticate, requireRole('worker', 'admin'), async (req, res) => {
    try {
        const { status } = req.body;
        await pool.query('UPDATE prayer_requests SET status=$1 WHERE id=$2', [status, req.params.id]);
        res.json({ success: true, message: 'Status updated.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Respond to prayer request
router.post('/:id/respond', authenticate, requireRole('worker', 'admin'), async (req, res) => {
    try {
        const { message } = req.body;
        await pool.query('INSERT INTO prayer_intercessions (prayer_id, user_id, message) VALUES ($1,$2,$3)', [req.params.id, req.user.id, message]);
        res.json({ success: true, message: 'Response saved.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
