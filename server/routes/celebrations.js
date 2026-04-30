const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({ destination: './public/uploads/celebrations/', filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)) });
const upload = multer({ storage });

// Get celebrations (public)
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT c.*, u.full_name as honoree_name, u.profile_photo as honoree_photo, a.full_name as posted_by,
             (SELECT COUNT(*) FROM celebration_reactions WHERE celebration_id=c.id) as like_count
             FROM celebrations c LEFT JOIN users u ON u.id=c.user_id LEFT JOIN users a ON a.id=c.author_id ORDER BY c.created_at DESC`
        );
        res.json({ success: true, celebrations: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Post celebration (workers/admin)
router.post('/', authenticate, requireRole('worker', 'admin'), upload.single('image'), async (req, res) => {
    try {
        const { user_id, type, title, message, is_auto } = req.body;
        const image_url = req.file ? `/uploads/celebrations/${req.file.filename}` : null;
        const result = await pool.query(
            'INSERT INTO celebrations (author_id, user_id, type, title, message, image_url, is_auto) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
            [req.user.id, user_id, type, title, message, image_url, is_auto || false]
        );
        res.status(201).json({ success: true, celebration: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Like/unlike
router.post('/:id/like', authenticate, async (req, res) => {
    try {
        const exists = await pool.query('SELECT id FROM celebration_reactions WHERE celebration_id=$1 AND user_id=$2', [req.params.id, req.user.id]);
        if (exists.rows.length) { await pool.query('DELETE FROM celebration_reactions WHERE celebration_id=$1 AND user_id=$2', [req.params.id, req.user.id]); return res.json({ success: true, liked: false }); }
        await pool.query('INSERT INTO celebration_reactions (celebration_id, user_id) VALUES ($1,$2)', [req.params.id, req.user.id]);
        res.json({ success: true, liked: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Comment
router.post('/:id/comment', authenticate, async (req, res) => {
    try {
        const { content } = req.body;
        const result = await pool.query('INSERT INTO celebration_comments (celebration_id, user_id, content) VALUES ($1,$2,$3) RETURNING *', [req.params.id, req.user.id, content]);
        res.status(201).json({ success: true, comment: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get comments
router.get('/:id/comments', async (req, res) => {
    try {
        const result = await pool.query('SELECT c.*, u.full_name, u.profile_photo FROM celebration_comments c JOIN users u ON u.id=c.user_id WHERE c.celebration_id=$1 ORDER BY c.created_at ASC', [req.params.id]);
        res.json({ success: true, comments: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
