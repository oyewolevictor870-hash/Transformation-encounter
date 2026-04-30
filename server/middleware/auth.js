const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/config');
const pool = require('../config/db');

const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
        if (!token) return res.status(401).json({ success: false, message: 'Access denied. Please log in.' });

        const decoded = jwt.verify(token, jwtSecret);
        const result = await pool.query('SELECT id, full_name, email, role, status FROM users WHERE id = $1', [decoded.id]);
        if (result.rows.length === 0) return res.status(401).json({ success: false, message: 'User not found.' });

        const user = result.rows[0];
        if (user.status !== 'active') return res.status(403).json({ success: false, message: 'Account not active. Contact admin.' });

        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid or expired session. Please log in again.' });
    }
};

const requireRole = (...roles) => (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated.' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ success: false, message: 'You do not have permission to do this.' });
    next();
};

const logWorkerAction = async (userId, action, details = '') => {
    try {
        await pool.query(
            'INSERT INTO worker_action_logs (worker_id, action, details) VALUES ($1, $2, $3)',
            [userId, action, details]
        );
    } catch (err) {
        console.error('Log error:', err.message);
    }
};

module.exports = { authenticate, requireRole, logWorkerAction };
