const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, requireRole, logWorkerAction } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: './public/uploads/posts/',
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Get feed posts (public: all can read)
router.get('/', async (req, res) => {
    try {
        const { type, page = 1, limit = 20, search } = req.query;
        const offset = (page - 1) * limit;
        let query = `SELECT p.*, u.full_name as author_name, u.profile_photo as author_photo,
            (SELECT COUNT(*) FROM post_reactions WHERE post_id = p.id) as reaction_count,
            (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comment_count
            FROM posts p LEFT JOIN users u ON u.id = p.author_id
            WHERE p.is_published = true AND (p.scheduled_at IS NULL OR p.scheduled_at <= NOW())`;
        const params = [];
        if (type) { params.push(type); query += ` AND p.type = $${params.length}`; }
        if (search) { params.push(`%${search}%`); query += ` AND (p.title ILIKE $${params.length} OR p.content ILIKE $${params.length})`; }
        query += ` ORDER BY p.is_pinned DESC, p.is_featured DESC, p.published_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);
        const result = await pool.query(query, params);
        res.json({ success: true, posts: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get single post
router.get('/:id', authenticate, async (req, res) => {
    try {
        const post = await pool.query(
            `SELECT p.*, u.full_name as author_name, u.profile_photo as author_photo FROM posts p LEFT JOIN users u ON u.id = p.author_id WHERE p.id = $1`,
            [req.params.id]
        );
        if (!post.rows.length) return res.status(404).json({ success: false, message: 'Post not found.' });
        await pool.query('INSERT INTO post_reads (post_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [req.params.id, req.user.id]);
        await pool.query('UPDATE posts SET read_count = read_count + 1 WHERE id = $1', [req.params.id]);
        const comments = await pool.query('SELECT c.*, u.full_name, u.profile_photo FROM post_comments c JOIN users u ON u.id=c.user_id WHERE c.post_id=$1 ORDER BY c.created_at ASC', [req.params.id]);
        const reactions = await pool.query('SELECT reaction, COUNT(*) FROM post_reactions WHERE post_id=$1 GROUP BY reaction', [req.params.id]);
        res.json({ success: true, post: post.rows[0], comments: comments.rows, reactions: reactions.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Create post (workers/admin only)
router.post('/', authenticate, requireRole('worker', 'admin'), upload.single('image'), async (req, res) => {
    try {
        const { type, title, content, is_pinned, is_featured, scheduled_at } = req.body;
        const image_url = req.file ? `/uploads/posts/${req.file.filename}` : null;
        const is_published = !scheduled_at;
        const published_at = scheduled_at ? null : new Date();
        const result = await pool.query(
            `INSERT INTO posts (author_id, type, title, content, image_url, is_pinned, is_featured, scheduled_at, is_published, published_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
            [req.user.id, type, title, content, image_url, is_pinned || false, is_featured || false, scheduled_at || null, is_published, published_at]
        );
        await logWorkerAction(req.user.id, 'CREATE_POST', `Type: ${type}, Title: ${title}`);
        res.status(201).json({ success: true, post: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// React to post
router.post('/:id/react', authenticate, async (req, res) => {
    try {
        const { reaction } = req.body;
        const existing = await pool.query('SELECT id FROM post_reactions WHERE post_id=$1 AND user_id=$2', [req.params.id, req.user.id]);
        if (existing.rows.length > 0) {
            await pool.query('UPDATE post_reactions SET reaction=$1 WHERE post_id=$2 AND user_id=$3', [reaction, req.params.id, req.user.id]);
        } else {
            await pool.query('INSERT INTO post_reactions (post_id, user_id, reaction) VALUES ($1,$2,$3)', [req.params.id, req.user.id, reaction]);
        }
        res.json({ success: true, message: 'Reaction saved.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Comment on post
router.post('/:id/comment', authenticate, async (req, res) => {
    try {
        const { content } = req.body;
        const result = await pool.query(
            'INSERT INTO post_comments (post_id, user_id, content) VALUES ($1,$2,$3) RETURNING *',
            [req.params.id, req.user.id, content]
        );
        res.status(201).json({ success: true, comment: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Bookmark post
router.post('/:id/bookmark', authenticate, async (req, res) => {
    try {
        const existing = await pool.query('SELECT id FROM post_bookmarks WHERE post_id=$1 AND user_id=$2', [req.params.id, req.user.id]);
        if (existing.rows.length > 0) {
            await pool.query('DELETE FROM post_bookmarks WHERE post_id=$1 AND user_id=$2', [req.params.id, req.user.id]);
            return res.json({ success: true, bookmarked: false });
        }
        await pool.query('INSERT INTO post_bookmarks (post_id, user_id) VALUES ($1,$2)', [req.params.id, req.user.id]);
        res.json({ success: true, bookmarked: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get bookmarks
router.get('/user/bookmarks', authenticate, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT p.* FROM post_bookmarks b JOIN posts p ON p.id=b.post_id WHERE b.user_id=$1 ORDER BY b.created_at DESC',
            [req.user.id]
        );
        res.json({ success: true, posts: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Delete post (admin)
router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
    try {
        await pool.query('DELETE FROM posts WHERE id=$1', [req.params.id]);
        res.json({ success: true, message: 'Post deleted.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
