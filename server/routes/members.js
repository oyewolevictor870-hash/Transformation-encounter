const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({ destination: './public/uploads/profiles/', filename: (req, file, cb) => cb(null, `${req.user?.id}_${Date.now()}${path.extname(file.originalname)}`) });
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Member directory (public readable names)
router.get('/directory', authenticate, async (req, res) => {
    try {
        const { search } = req.query;
        let query = "SELECT id, full_name, profile_photo, bio, department, role FROM users WHERE status='active' AND role IN ('member','worker','admin')";
        const params = [];
        if (search) { params.push(`%${search}%`); query += ` AND full_name ILIKE $1`; }
        query += ' ORDER BY full_name ASC';
        const result = await pool.query(query, params);
        res.json({ success: true, members: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get own profile
router.get('/profile', authenticate, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, full_name, email, phone, bio, birthday, salvation_date, baptism_date, profile_photo, department, whatsapp_number, dark_mode, onboarding_complete, created_at FROM users WHERE id=$1',
            [req.user.id]
        );
        res.json({ success: true, profile: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Update profile
router.put('/profile', authenticate, upload.single('photo'), async (req, res) => {
    try {
        const { full_name, bio, phone, birthday, salvation_date, whatsapp_number, dark_mode, department } = req.body;
        const profile_photo = req.file ? `/uploads/profiles/${req.file.filename}` : undefined;
        const fields = ['full_name=$2', 'bio=$3', 'phone=$4', 'birthday=$5', 'salvation_date=$6', 'whatsapp_number=$7', 'dark_mode=$8', 'department=$9'];
        const values = [req.user.id, full_name, bio, phone, birthday || null, salvation_date || null, whatsapp_number, dark_mode, department || null];
        if (profile_photo) { fields.push(`profile_photo=$${values.length + 1}`); values.push(profile_photo); }
        await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id=$1`, values);
        res.json({ success: true, message: 'Profile updated.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Complete onboarding
router.put('/onboarding/complete', authenticate, async (req, res) => {
    try {
        await pool.query('UPDATE users SET onboarding_complete=true WHERE id=$1', [req.user.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Submit birthday details
router.put('/birthday', authenticate, async (req, res) => {
    try {
        const { birthday } = req.body;
        await pool.query('UPDATE users SET birthday=$1 WHERE id=$2', [birthday, req.user.id]);
        res.json({ success: true, message: 'Birthday saved.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Add spiritual milestone
router.post('/milestones', authenticate, async (req, res) => {
    try {
        const { type, title, description, milestone_date } = req.body;
        const result = await pool.query('INSERT INTO spiritual_milestones (user_id, type, title, description, milestone_date) VALUES ($1,$2,$3,$4,$5) RETURNING *', [req.user.id, type, title, description, milestone_date]);
        res.status(201).json({ success: true, milestone: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get milestones
router.get('/milestones', authenticate, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM spiritual_milestones WHERE user_id=$1 ORDER BY milestone_date DESC', [req.user.id]);
        res.json({ success: true, milestones: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
