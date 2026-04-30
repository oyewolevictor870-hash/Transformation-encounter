const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, requireRole, logWorkerAction } = require('../middleware/auth');
const { sendNotificationToUser } = require('../jobs/notifications');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: './public/uploads/testimonies/',
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Get approved testimonies (public)
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT t.*, u.full_name, u.profile_photo FROM testimonies t
             JOIN users u ON u.id = t.user_id WHERE t.status = 'approved' ORDER BY t.approved_at DESC`
        );
        res.json({ success: true, testimonies: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Submit testimony
router.post('/', authenticate, upload.single('image'), async (req, res) => {
    try {
        const { title, content } = req.body;
        const image_url = req.file ? `/uploads/testimonies/${req.file.filename}` : null;
        const result = await pool.query(
            'INSERT INTO testimonies (user_id, title, content, image_url) VALUES ($1,$2,$3,$4) RETURNING *',
            [req.user.id, title, content, image_url]
        );
        res.status(201).json({ success: true, message: 'Testimony submitted for approval.', testimony: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get pending (workers/admin)
router.get('/pending', authenticate, requireRole('worker', 'admin'), async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT t.*, u.full_name, u.email FROM testimonies t JOIN users u ON u.id=t.user_id WHERE t.status='pending' ORDER BY t.created_at ASC`
        );
        res.json({ success: true, testimonies: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Approve testimony
router.put('/:id/approve', authenticate, requireRole('worker', 'admin'), async (req, res) => {
    try {
        const result = await pool.query(
            `UPDATE testimonies SET status='approved', approved_by=$1, approved_at=NOW() WHERE id=$2 RETURNING user_id, title`,
            [req.user.id, req.params.id]
        );
        const testimony = result.rows[0];
        await sendNotificationToUser(testimony.user_id, 'testimony_approved', 'Testimony Approved!', `Your testimony "${testimony.title}" has been approved and is now live.`);
        await logWorkerAction(req.user.id, 'APPROVE_TESTIMONY', `Approved: ${testimony.title}`);
        res.json({ success: true, message: 'Testimony approved.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Reject testimony
router.put('/:id/reject', authenticate, requireRole('worker', 'admin'), async (req, res) => {
    try {
        const { reason } = req.body;
        const result = await pool.query(
            `UPDATE testimonies SET status='rejected', rejection_reason=$1 WHERE id=$2 RETURNING user_id, title`,
            [reason, req.params.id]
        );
        await sendNotificationToUser(result.rows[0].user_id, 'testimony_rejected', 'Testimony Update', `Your testimony needs revision. Reason: ${reason}`);
        res.json({ success: true, message: 'Testimony rejected.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
