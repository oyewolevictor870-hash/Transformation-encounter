const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');

// Get active polls
router.get('/', authenticate, async (req, res) => {
    try {
        const result = await pool.query(`SELECT p.*, u.full_name as author_name,
            json_agg(json_build_object('id', po.id, 'text', po.option_text, 'votes', po.vote_count)) as options
            FROM polls p LEFT JOIN users u ON u.id=p.author_id LEFT JOIN poll_options po ON po.poll_id=p.id
            WHERE p.is_active=true GROUP BY p.id, u.full_name ORDER BY p.created_at DESC`);
        res.json({ success: true, polls: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Create poll (admin)
router.post('/', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const { question, options, end_date } = req.body;
        const poll = await pool.query('INSERT INTO polls (author_id, question, end_date) VALUES ($1,$2,$3) RETURNING id', [req.user.id, question, end_date || null]);
        const pollId = poll.rows[0].id;
        for (const opt of options) {
            await pool.query('INSERT INTO poll_options (poll_id, option_text) VALUES ($1,$2)', [pollId, opt]);
        }
        res.status(201).json({ success: true, message: 'Poll created.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Vote
router.post('/:id/vote', authenticate, async (req, res) => {
    try {
        const { option_id } = req.body;
        const existing = await pool.query('SELECT id FROM poll_votes WHERE poll_id=$1 AND user_id=$2', [req.params.id, req.user.id]);
        if (existing.rows.length) return res.status(400).json({ success: false, message: 'Already voted.' });
        await pool.query('INSERT INTO poll_votes (poll_id, option_id, user_id) VALUES ($1,$2,$3)', [req.params.id, option_id, req.user.id]);
        await pool.query('UPDATE poll_options SET vote_count=vote_count+1 WHERE id=$1', [option_id]);
        res.json({ success: true, message: 'Vote recorded.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
