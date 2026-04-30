const pool = require('../config/db');
const { sendEmail } = require('./mailer');

const sendNotificationToUser = async (userId, type, title, message, link = null) => {
    try {
        await pool.query(
            'INSERT INTO notifications (user_id, type, title, message, link) VALUES ($1,$2,$3,$4,$5)',
            [userId, type, title, message, link]
        );
        const user = await pool.query('SELECT email FROM users WHERE id=$1', [userId]);
        if (user.rows.length) {
            await sendEmail(user.rows[0].email, title, message);
        }
    } catch (err) {
        console.error('Notification error:', err.message);
    }
};

const sendNotificationToAll = async (type, title, message, link = null) => {
    try {
        const users = await pool.query("SELECT id, email FROM users WHERE status='active' AND role IN ('member','worker','admin')");
        for (const user of users.rows) {
            await pool.query(
                'INSERT INTO notifications (user_id, type, title, message, link) VALUES ($1,$2,$3,$4,$5)',
                [user.id, type, title, message, link]
            );
        }
        const emails = users.rows.map(u => u.email).filter(Boolean);
        if (emails.length) {
            await sendEmail(emails.join(','), title, message);
        }
    } catch (err) {
        console.error('Broadcast notification error:', err.message);
    }
};

const sendNotificationToRole = async (role, type, title, message) => {
    try {
        const users = await pool.query("SELECT id FROM users WHERE role=$1 AND status='active'", [role]);
        for (const user of users.rows) {
            await sendNotificationToUser(user.id, type, title, message);
        }
    } catch (err) {
        console.error('Role notification error:', err.message);
    }
};

module.exports = { sendNotificationToUser, sendNotificationToAll, sendNotificationToRole };
