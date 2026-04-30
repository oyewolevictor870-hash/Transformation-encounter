const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');

// Get all questions (public)
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT q.*, CASE WHEN q.is_anonymous THEN 'Anonymous' ELSE u.full_name END as asker_name,
             (SELECT COUNT(*) FROM question_answers WHERE question_id=q.id) as answer_count
             FROM questions q LEFT JOIN users u ON u.id=q.user_id ORDER BY q.created_at DESC`
        );
        res.json({ success: true, questions: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get single question with answers
router.get('/:id', async (req, res) => {
    try {
        const q = await pool.query(`SELECT q.*, CASE WHEN q.is_anonymous THEN 'Anonymous' ELSE u.full_name END as asker_name FROM questions q LEFT JOIN users u ON u.id=q.user_id WHERE q.id=$1`, [req.params.id]);
        const answers = await pool.query('SELECT a.*, u.full_name, u.role, u.profile_photo FROM question_answers a JOIN users u ON u.id=a.user_id WHERE a.question_id=$1 ORDER BY a.created_at ASC', [req.params.id]);
        res.json({ success: true, question: q.rows[0], answers: answers.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Ask question (member+)
router.post('/', authenticate, async (req, res) => {
    try {
        const { title, content, is_anonymous } = req.body;
        const result = await pool.query('INSERT INTO questions (user_id, title, content, is_anonymous) VALUES ($1,$2,$3,$4) RETURNING *', [req.user.id, title, content, is_anonymous || false]);
        res.status(201).json({ success: true, question: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Answer question (workers/admin)
router.post('/:id/answer', authenticate, requireRole('worker', 'admin'), async (req, res) => {
    try {
        const { content } = req.body;
        const result = await pool.query('INSERT INTO question_answers (question_id, user_id, content) VALUES ($1,$2,$3) RETURNING *', [req.params.id, req.user.id, content]);
        res.status(201).json({ success: true, answer: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
