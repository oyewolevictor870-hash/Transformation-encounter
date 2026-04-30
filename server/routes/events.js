const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, requireRole, logWorkerAction } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({ destination: './public/uploads/events/', filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)) });
const upload = multer({ storage });

// Get all events (public)
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT e.*, u.full_name as organizer,
             (SELECT COUNT(*) FROM event_rsvps WHERE event_id=e.id AND status='attending') as attendee_count
             FROM events e LEFT JOIN users u ON u.id=e.author_id WHERE e.is_public=true ORDER BY e.event_date ASC`
        );
        res.json({ success: true, events: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get upcoming events
router.get('/upcoming', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM events WHERE event_date >= NOW() AND is_public=true ORDER BY event_date ASC LIMIT 10');
        res.json({ success: true, events: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Create event (workers/admin)
router.post('/', authenticate, requireRole('worker', 'admin'), upload.single('flyer'), async (req, res) => {
    try {
        const { title, description, event_date, end_date, location, virtual_link, is_virtual, is_public, max_attendees } = req.body;
        const flyer_url = req.file ? `/uploads/events/${req.file.filename}` : null;
        const result = await pool.query(
            `INSERT INTO events (author_id, title, description, event_date, end_date, location, virtual_link, is_virtual, is_public, flyer_url, max_attendees)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
            [req.user.id, title, description, event_date, end_date || null, location, virtual_link || null, is_virtual || false, is_public !== false, flyer_url, max_attendees || null]
        );
        await logWorkerAction(req.user.id, 'CREATE_EVENT', title);
        res.status(201).json({ success: true, event: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// RSVP to event
router.post('/:id/rsvp', authenticate, async (req, res) => {
    try {
        const { status } = req.body;
        await pool.query(
            'INSERT INTO event_rsvps (event_id, user_id, status) VALUES ($1,$2,$3) ON CONFLICT (event_id, user_id) DO UPDATE SET status=$3',
            [req.params.id, req.user.id, status || 'attending']
        );
        res.json({ success: true, message: 'RSVP recorded.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Check in to event (digital attendance)
router.post('/:id/checkin', authenticate, async (req, res) => {
    try {
        await pool.query('UPDATE event_rsvps SET checked_in=true, checked_in_at=NOW() WHERE event_id=$1 AND user_id=$2', [req.params.id, req.user.id]);
        res.json({ success: true, message: 'Checked in.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get event attendees (workers/admin)
router.get('/:id/attendees', authenticate, requireRole('worker', 'admin'), async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT u.full_name, u.email, u.phone, r.status, r.checked_in, r.checked_in_at FROM event_rsvps r JOIN users u ON u.id=r.user_id WHERE r.event_id=$1',
            [req.params.id]
        );
        res.json({ success: true, attendees: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Past events archive
router.get('/past', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM events WHERE event_date < NOW() ORDER BY event_date DESC LIMIT 50');
        res.json({ success: true, events: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
