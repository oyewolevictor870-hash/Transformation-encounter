const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({ destination: './public/uploads/resources/', filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)) });
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// Get resources
router.get('/', async (req, res) => {
    try {
        const { is_public } = req.query;
        const query = is_public === 'false'
            ? 'SELECT r.*, u.full_name as uploader FROM resources r LEFT JOIN users u ON u.id=r.author_id ORDER BY r.created_at DESC'
            : 'SELECT r.*, u.full_name as uploader FROM resources r LEFT JOIN users u ON u.id=r.author_id WHERE r.is_public=true ORDER BY r.created_at DESC';
        const result = await pool.query(query);
        res.json({ success: true, resources: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Upload resource (workers/admin)
router.post('/', authenticate, requireRole('worker', 'admin'), upload.single('file'), async (req, res) => {
    try {
        const { title, description, category, is_public } = req.body;
        const file_url = `/uploads/resources/${req.file.filename}`;
        const file_type = path.extname(req.file.originalname).replace('.', '');
        await pool.query('INSERT INTO resources (author_id, title, description, file_url, file_type, category, is_public) VALUES ($1,$2,$3,$4,$5,$6,$7)', [req.user.id, title, description, file_url, file_type, category, is_public !== 'false']);
        res.status(201).json({ success: true, message: 'Resource uploaded.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Track download
router.put('/:id/download', async (req, res) => {
    try {
        await pool.query('UPDATE resources SET download_count=download_count+1 WHERE id=$1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Flyers
router.get('/flyers', async (req, res) => {
    try {
        const result = await pool.query('SELECT f.*, u.full_name as uploader FROM flyers f LEFT JOIN users u ON u.id=f.author_id ORDER BY f.created_at DESC');
        res.json({ success: true, flyers: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post('/flyers', authenticate, requireRole('worker', 'admin'), upload.single('image'), async (req, res) => {
    try {
        const { title, description, is_public } = req.body;
        const image_url = `/uploads/resources/${req.file.filename}`;
        await pool.query('INSERT INTO flyers (author_id, title, description, image_url, is_public) VALUES ($1,$2,$3,$4,$5)', [req.user.id, title, description, image_url, is_public !== 'false']);
        res.status(201).json({ success: true, message: 'Flyer uploaded.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Gallery
router.get('/gallery', async (req, res) => {
    try {
        const result = await pool.query('SELECT g.*, u.full_name as uploader FROM gallery g LEFT JOIN users u ON u.id=g.author_id WHERE g.is_public=true ORDER BY g.created_at DESC');
        res.json({ success: true, gallery: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post('/gallery', authenticate, requireRole('worker', 'admin'), upload.single('image'), async (req, res) => {
    try {
        const { title, description, event_id } = req.body;
        const image_url = `/uploads/resources/${req.file.filename}`;
        await pool.query('INSERT INTO gallery (author_id, title, description, image_url, event_id) VALUES ($1,$2,$3,$4,$5)', [req.user.id, title, description, image_url, event_id || null]);
        res.status(201).json({ success: true, message: 'Image uploaded.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
