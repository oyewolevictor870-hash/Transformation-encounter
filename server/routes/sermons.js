const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({ destination: (req, file, cb) => {
    const dir = file.mimetype.startsWith('audio') ? './public/uploads/sermons/audio/' : './public/uploads/sermons/thumbnails/';
    cb(null, dir);
}, filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)) });
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

// Get all sermons (public)
router.get('/', async (req, res) => {
    try {
        const { search, series } = req.query;
        let query = 'SELECT s.*, u.full_name as uploader FROM sermons s LEFT JOIN users u ON u.id=s.author_id WHERE 1=1';
        const params = [];
        if (search) { params.push(`%${search}%`); query += ` AND (s.title ILIKE $${params.length} OR s.speaker ILIKE $${params.length})`; }
        if (series) { params.push(series); query += ` AND s.series=$${params.length}`; }
        query += ' ORDER BY s.created_at DESC';
        const result = await pool.query(query, params);
        res.json({ success: true, sermons: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Upload sermon (workers/admin)
router.post('/', authenticate, requireRole('worker', 'admin'), upload.fields([{ name: 'audio', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), async (req, res) => {
    try {
        const { title, speaker, description, duration, series, tags } = req.body;
        const audio_url = req.files.audio ? `/uploads/sermons/audio/${req.files.audio[0].filename}` : null;
        const thumbnail_url = req.files.thumbnail ? `/uploads/sermons/thumbnails/${req.files.thumbnail[0].filename}` : null;
        const result = await pool.query(
            'INSERT INTO sermons (author_id, title, speaker, description, audio_url, thumbnail_url, duration, series, tags) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
            [req.user.id, title, speaker, description, audio_url, thumbnail_url, duration, series, tags]
        );
        res.status(201).json({ success: true, sermon: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Bookmark sermon
router.post('/:id/bookmark', authenticate, async (req, res) => {
    try {
        const exists = await pool.query('SELECT id FROM sermon_bookmarks WHERE sermon_id=$1 AND user_id=$2', [req.params.id, req.user.id]);
        if (exists.rows.length) { await pool.query('DELETE FROM sermon_bookmarks WHERE sermon_id=$1 AND user_id=$2', [req.params.id, req.user.id]); return res.json({ success: true, bookmarked: false }); }
        await pool.query('INSERT INTO sermon_bookmarks (sermon_id, user_id) VALUES ($1,$2)', [req.params.id, req.user.id]);
        res.json({ success: true, bookmarked: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Post sermon notes (workers/admin)
router.post('/:id/notes', authenticate, requireRole('worker', 'admin'), async (req, res) => {
    try {
        const { title, content } = req.body;
        await pool.query('INSERT INTO sermon_notes (sermon_id, author_id, title, content, is_published) VALUES ($1,$2,$3,$4,true)', [req.params.id, req.user.id, title, content]);
        res.json({ success: true, message: 'Notes published.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
