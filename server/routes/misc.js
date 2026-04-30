const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({ destination: './public/uploads/misc/', filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)) });
const upload = multer({ storage });

// Scripture of the day
router.get('/scripture', async (req, res) => {
    try {
        const today = new Date().toISOString().slice(0, 10);
        const result = await pool.query('SELECT * FROM scripture_of_day WHERE date=$1', [today]);
        res.json({ success: true, scripture: result.rows[0] || null });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post('/scripture', authenticate, requireRole('worker', 'admin'), async (req, res) => {
    try {
        const { date, reference, text, reflection } = req.body;
        await pool.query('INSERT INTO scripture_of_day (date, reference, text, reflection) VALUES ($1,$2,$3,$4) ON CONFLICT (date) DO UPDATE SET reference=$2, text=$3, reflection=$4', [date, reference, text, reflection]);
        res.json({ success: true, message: 'Scripture saved.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Worship lyrics
router.get('/lyrics', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM worship_lyrics ORDER BY song_title ASC');
        res.json({ success: true, lyrics: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post('/lyrics', authenticate, requireRole('worker', 'admin'), async (req, res) => {
    try {
        const { song_title, artist, lyrics, key_signature } = req.body;
        await pool.query('INSERT INTO worship_lyrics (author_id, song_title, artist, lyrics, key_signature) VALUES ($1,$2,$3,$4,$5)', [req.user.id, song_title, artist, lyrics, key_signature]);
        res.json({ success: true, message: 'Lyrics added.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Newsletter
router.get('/newsletter', async (req, res) => {
    try {
        const result = await pool.query('SELECT n.*, u.full_name as author_name FROM newsletters n LEFT JOIN users u ON u.id=n.author_id WHERE n.is_published=true ORDER BY n.published_at DESC');
        res.json({ success: true, newsletters: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post('/newsletter', authenticate, requireRole('worker', 'admin'), async (req, res) => {
    try {
        const { title, content } = req.body;
        await pool.query('INSERT INTO newsletters (author_id, title, content) VALUES ($1,$2,$3)', [req.user.id, title, content]);
        res.json({ success: true, message: 'Newsletter published.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Bible reading plan
router.get('/bible-plan', authenticate, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM bible_plans WHERE is_active=true ORDER BY created_at DESC LIMIT 1');
        if (!result.rows.length) return res.json({ success: true, plan: null });
        const plan = result.rows[0];
        const days = await pool.query('SELECT * FROM bible_plan_days WHERE plan_id=$1 ORDER BY day_number ASC', [plan.id]);
        const progress = await pool.query('SELECT day_id FROM bible_plan_progress WHERE plan_id=$1 AND user_id=$2', [plan.id, req.user.id]);
        res.json({ success: true, plan, days: days.rows, completed_days: progress.rows.map(r => r.day_id) });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post('/bible-plan/progress/:day_id', authenticate, async (req, res) => {
    try {
        const { plan_id } = req.body;
        await pool.query('INSERT INTO bible_plan_progress (plan_id, day_id, user_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [plan_id, req.params.day_id, req.user.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Prayer points
router.get('/prayer-points', async (req, res) => {
    try {
        const today = new Date().toISOString().slice(0, 10);
        const result = await pool.query('SELECT * FROM prayer_points WHERE date=$1', [today]);
        res.json({ success: true, points: result.rows[0] || null });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post('/prayer-points', authenticate, requireRole('worker', 'admin'), async (req, res) => {
    try {
        const { date, title, points, scripture } = req.body;
        await pool.query('INSERT INTO prayer_points (author_id, date, title, points, scripture) VALUES ($1,$2,$3,$4,$5)', [req.user.id, date, title, points, scripture]);
        res.json({ success: true, message: 'Prayer points posted.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Fasting
router.get('/fasting', authenticate, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM fasting_periods WHERE is_active=true ORDER BY start_date ASC');
        res.json({ success: true, fasts: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post('/fasting', authenticate, requireRole('worker', 'admin'), async (req, res) => {
    try {
        const { title, description, start_date, end_date, instructions } = req.body;
        const duration = Math.ceil((new Date(end_date) - new Date(start_date)) / (1000 * 60 * 60 * 24));
        await pool.query('INSERT INTO fasting_periods (author_id, title, description, start_date, end_date, duration_days, instructions) VALUES ($1,$2,$3,$4,$5,$6,$7)', [req.user.id, title, description, start_date, end_date, duration, instructions]);
        res.json({ success: true, message: 'Fasting period declared.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post('/fasting/:id/join', authenticate, async (req, res) => {
    try {
        await pool.query('INSERT INTO fasting_participants (fast_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [req.params.id, req.user.id]);
        res.json({ success: true, message: 'Joined the fast.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Voice rooms status
router.get('/voice-rooms', async (req, res) => {
    try {
        const result = await pool.query('SELECT vr.*, u.full_name as started_by_name FROM voice_rooms vr LEFT JOIN users u ON u.id=vr.started_by WHERE vr.is_active=true');
        res.json({ success: true, rooms: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Visitor contact form
router.post('/contact', async (req, res) => {
    try {
        const { name, email, phone, message } = req.body;
        await pool.query('INSERT INTO visitor_contacts (name, email, phone, message) VALUES ($1,$2,$3,$4)', [name, email, phone, message]);
        res.json({ success: true, message: 'Message received. We will be in touch.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Live stream status
router.get('/livestream', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM live_streams WHERE is_live=true ORDER BY started_at DESC LIMIT 1');
        res.json({ success: true, stream: result.rows[0] || null });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post('/livestream', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const { title, stream_url, action } = req.body;
        if (action === 'start') {
            await pool.query('UPDATE live_streams SET is_live=false');
            await pool.query('INSERT INTO live_streams (title, stream_url, is_live, started_by, started_at) VALUES ($1,$2,true,$3,NOW())', [title, stream_url, req.user.id]);
        } else {
            await pool.query('UPDATE live_streams SET is_live=false, ended_at=NOW() WHERE is_live=true');
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
