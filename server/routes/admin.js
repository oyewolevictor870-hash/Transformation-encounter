const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const { authenticate, requireRole, logWorkerAction } = require('../middleware/auth');
const { sendNotificationToAll, sendNotificationToUser } = require('../jobs/notifications');

const adminOnly = [authenticate, requireRole('admin')];
const workerAndAdmin = [authenticate, requireRole('worker', 'admin')];

// Dashboard stats
router.get('/dashboard', adminOnly, async (req, res) => {
    try {
        const [members, pending, payments, events, prayers] = await Promise.all([
            pool.query("SELECT COUNT(*) FROM users WHERE role IN ('member', 'worker', 'admin') AND status = 'active'"),
            pool.query("SELECT COUNT(*) FROM users WHERE status = 'pending'"),
            pool.query("SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE status = 'successful' AND month_year = TO_CHAR(NOW(),'YYYY-MM')"),
            pool.query("SELECT COUNT(*) FROM events WHERE event_date >= NOW()"),
            pool.query("SELECT COUNT(*) FROM prayer_requests WHERE status = 'active'")
        ]);
        res.json({
            success: true,
            stats: {
                total_members: parseInt(members.rows[0].count),
                pending_approvals: parseInt(pending.rows[0].count),
                monthly_collection: parseFloat(payments.rows[0].total),
                upcoming_events: parseInt(events.rows[0].count),
                active_prayers: parseInt(prayers.rows[0].count)
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get all members
router.get('/members', adminOnly, async (req, res) => {
    try {
        const { role, status, search } = req.query;
        let query = 'SELECT id, full_name, email, phone, role, status, profile_photo, birthday, department, created_at, last_active FROM users WHERE 1=1';
        const params = [];
        if (role) { params.push(role); query += ` AND role = $${params.length}`; }
        if (status) { params.push(status); query += ` AND status = $${params.length}`; }
        if (search) { params.push(`%${search}%`); query += ` AND (full_name ILIKE $${params.length} OR email ILIKE $${params.length})`; }
        query += ' ORDER BY created_at DESC';
        const result = await pool.query(query, params);
        res.json({ success: true, members: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get pending registrations
router.get('/pending', adminOnly, async (req, res) => {
    try {
        const result = await pool.query("SELECT id, full_name, email, phone, birthday, created_at FROM users WHERE status = 'pending' ORDER BY created_at ASC");
        res.json({ success: true, pending: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Approve member
router.put('/approve/:id', adminOnly, async (req, res) => {
    try {
        const result = await pool.query(
            "UPDATE users SET status = 'active', role = 'member', approved_at = NOW(), approved_by = $1 WHERE id = $2 RETURNING full_name, email",
            [req.user.id, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found.' });
        const user = result.rows[0];
        await sendNotificationToUser(req.params.id, 'welcome', 'Welcome to Transformation Encounter!', `Dear ${user.full_name}, your registration has been approved. Welcome to the family!`);
        await logWorkerAction(req.user.id, 'APPROVE_MEMBER', `Approved: ${user.full_name}`);
        res.json({ success: true, message: `${user.full_name} approved successfully.` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Reject / Remove member
router.delete('/member/:id', adminOnly, async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING full_name', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Member not found.' });
        await logWorkerAction(req.user.id, 'REMOVE_MEMBER', `Removed: ${result.rows[0].full_name}`);
        res.json({ success: true, message: `${result.rows[0].full_name} has been removed successfully.` });
    } catch (err) {
        console.error('Delete member error:', err.message);
        if (err.message && err.message.includes('foreign key')) {
            return res.status(400).json({ success: false, message: 'Cannot delete member — run the database fix SQL first to resolve linked records.' });
        }
        res.status(500).json({ success: false, message: err.message });
    }
});

// Change role
router.put('/role/:id', adminOnly, async (req, res) => {
    try {
        const { role } = req.body;
        if (!['member', 'worker', 'admin'].includes(role)) return res.status(400).json({ success: false, message: 'Invalid role.' });
        const result = await pool.query('UPDATE users SET role = $1 WHERE id = $2 RETURNING full_name', [role, req.params.id]);
        await sendNotificationToUser(req.params.id, 'role_change', 'Role Updated', `Your role has been updated to ${role}.`);
        await logWorkerAction(req.user.id, 'CHANGE_ROLE', `Changed ${result.rows[0]?.full_name} to ${role}`);
        res.json({ success: true, message: 'Role updated.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Financial dashboard
router.get('/financials', adminOnly, async (req, res) => {
    try {
        const { month_year } = req.query;
        const period = month_year || new Date().toISOString().slice(0, 7);
        const [summary, paid, unpaid, history] = await Promise.all([
            pool.query("SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count FROM payments WHERE status='successful' AND month_year=$1", [period]),
            pool.query("SELECT u.full_name, u.email, p.amount, p.created_at FROM payments p JOIN users u ON u.id=p.user_id WHERE p.status='successful' AND p.month_year=$1 ORDER BY p.created_at DESC", [period]),
            pool.query("SELECT u.full_name, u.email FROM users u WHERE u.role IN ('member','worker','admin') AND u.status='active' AND u.id NOT IN (SELECT user_id FROM payments WHERE status='successful' AND month_year=$1)", [period]),
            pool.query("SELECT u.full_name, p.type, p.amount, p.status, p.month_year, p.created_at FROM payments p JOIN users u ON u.id=p.user_id ORDER BY p.created_at DESC LIMIT 100")
        ]);
        res.json({ success: true, period, summary: summary.rows[0], paid: paid.rows, unpaid: unpaid.rows, history: history.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Set dues amount
router.post('/dues/set', adminOnly, async (req, res) => {
    try {
        const { amount, month_year } = req.body;
        await pool.query('INSERT INTO dues_settings (amount, month_year, set_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [amount, month_year, req.user.id]);
        res.json({ success: true, message: 'Dues amount set.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Send broadcast notification
router.post('/notify/all', adminOnly, async (req, res) => {
    try {
        const { title, message, type } = req.body;
        await sendNotificationToAll(type || 'broadcast', title, message);
        await logWorkerAction(req.user.id, 'BROADCAST_NOTIFICATION', title);
        res.json({ success: true, message: 'Notification sent to all.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Voice room control
router.post('/voice-room/toggle', adminOnly, async (req, res) => {
    try {
        const { type, action } = req.body;
        if (action === 'start') {
            await pool.query("UPDATE voice_rooms SET is_active=false WHERE type=$1", [type]);
            await pool.query("INSERT INTO voice_rooms (type, is_active, started_by, started_at) VALUES ($1, true, $2, NOW())", [type, req.user.id]);
            if (type === 'general_prayer') {
                await sendNotificationToAll('prayer_room_live', '🙏 Prayer Room is LIVE!', 'The General Prayer Room is now open. Join us now!');
            }
        } else {
            await pool.query("UPDATE voice_rooms SET is_active=false, ended_at=NOW() WHERE type=$1 AND is_active=true", [type]);
        }
        await logWorkerAction(req.user.id, `VOICE_ROOM_${action.toUpperCase()}`, type);
        res.json({ success: true, message: `${type} ${action}ed.` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Worker action logs
router.get('/logs', adminOnly, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT w.*, u.full_name FROM worker_action_logs w JOIN users u ON u.id=w.worker_id ORDER BY w.created_at DESC LIMIT 200'
        );
        res.json({ success: true, logs: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Visitor contacts
router.get('/visitor-contacts', adminOnly, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM visitor_contacts ORDER BY created_at DESC');
        res.json({ success: true, contacts: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Member growth report
router.get('/reports/growth', adminOnly, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as new_members FROM users WHERE status='active' GROUP BY month ORDER BY month DESC LIMIT 12"
        );
        res.json({ success: true, report: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Delete any content
router.delete('/content/:table/:id', adminOnly, async (req, res) => {
    try {
        const allowed = ['posts', 'post_comments', 'testimonies', 'flyers', 'questions', 'prayer_requests', 'celebration_comments', 'sermons', 'videos'];
        const { table, id } = req.params;
        if (!allowed.includes(table)) return res.status(400).json({ success: false, message: 'Invalid content type.' });
        await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
        await logWorkerAction(req.user.id, 'DELETE_CONTENT', `Deleted from ${table}: ${id}`);
        res.json({ success: true, message: 'Content removed.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
// const express = require('express');
// const router = express.Router();
// const pool = require('../config/db');
// const bcrypt = require('bcryptjs');
// const { authenticate, requireRole, logWorkerAction } = require('../middleware/auth');
// const { sendNotificationToAll, sendNotificationToUser } = require('../jobs/notifications');

// const adminOnly = [authenticate, requireRole('admin')];
// const workerAndAdmin = [authenticate, requireRole('worker', 'admin')];

// // Dashboard stats
// router.get('/dashboard', adminOnly, async (req, res) => {
//     try {
//         const [members, pending, payments, events, prayers] = await Promise.all([
//             pool.query("SELECT COUNT(*) FROM users WHERE role IN ('member', 'worker', 'admin') AND status = 'active'"),
//             pool.query("SELECT COUNT(*) FROM users WHERE status = 'pending'"),
//             pool.query("SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE status = 'successful' AND month_year = TO_CHAR(NOW(),'YYYY-MM')"),
//             pool.query("SELECT COUNT(*) FROM events WHERE event_date >= NOW()"),
//             pool.query("SELECT COUNT(*) FROM prayer_requests WHERE status = 'active'")
//         ]);
//         res.json({
//             success: true,
//             stats: {
//                 total_members: parseInt(members.rows[0].count),
//                 pending_approvals: parseInt(pending.rows[0].count),
//                 monthly_collection: parseFloat(payments.rows[0].total),
//                 upcoming_events: parseInt(events.rows[0].count),
//                 active_prayers: parseInt(prayers.rows[0].count)
//             }
//         });
//     } catch (err) {
//         res.status(500).json({ success: false, message: err.message });
//     }
// });

// // Get all members
// router.get('/members', adminOnly, async (req, res) => {
//     try {
//         const { role, status, search } = req.query;
//         let query = 'SELECT id, full_name, email, phone, role, status, profile_photo, birthday, department, created_at, last_active FROM users WHERE 1=1';
//         const params = [];
//         if (role) { params.push(role); query += ` AND role = $${params.length}`; }
//         if (status) { params.push(status); query += ` AND status = $${params.length}`; }
//         if (search) { params.push(`%${search}%`); query += ` AND (full_name ILIKE $${params.length} OR email ILIKE $${params.length})`; }
//         query += ' ORDER BY created_at DESC';
//         const result = await pool.query(query, params);
//         res.json({ success: true, members: result.rows });
//     } catch (err) {
//         res.status(500).json({ success: false, message: err.message });
//     }
// });

// // Get pending registrations
// router.get('/pending', adminOnly, async (req, res) => {
//     try {
//         const result = await pool.query("SELECT id, full_name, email, phone, birthday, created_at FROM users WHERE status = 'pending' ORDER BY created_at ASC");
//         res.json({ success: true, pending: result.rows });
//     } catch (err) {
//         res.status(500).json({ success: false, message: err.message });
//     }
// });

// // Approve member
// router.put('/approve/:id', adminOnly, async (req, res) => {
//     try {
//         const result = await pool.query(
//             "UPDATE users SET status = 'active', role = 'member', approved_at = NOW(), approved_by = $1 WHERE id = $2 RETURNING full_name, email",
//             [req.user.id, req.params.id]
//         );
//         if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found.' });
//         const user = result.rows[0];
//         await sendNotificationToUser(req.params.id, 'welcome', 'Welcome to Transformation Encounter!', `Dear ${user.full_name}, your registration has been approved. Welcome to the family!`);
//         await logWorkerAction(req.user.id, 'APPROVE_MEMBER', `Approved: ${user.full_name}`);
//         res.json({ success: true, message: `${user.full_name} approved successfully.` });
//     } catch (err) {
//         res.status(500).json({ success: false, message: err.message });
//     }
// });

// // Reject / Remove member
// router.delete('/member/:id', adminOnly, async (req, res) => {
//     try {
//         const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING full_name', [req.params.id]);
//         if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Member not found.' });
//         await logWorkerAction(req.user.id, 'REMOVE_MEMBER', `Removed: ${result.rows[0].full_name}`);
//         res.json({ success: true, message: `${result.rows[0].full_name} has been removed successfully.` });
//     } catch (err) {
//         console.error('Delete member error:', err.message);
//         if (err.message && err.message.includes('foreign key')) {
//             return res.status(400).json({ success: false, message: 'Cannot delete member — run the database fix SQL first to resolve linked records.' });
//         }
//         res.status(500).json({ success: false, message: err.message });
//     }
// });

// // Change role
// router.put('/role/:id', adminOnly, async (req, res) => {
//     try {
//         const { role } = req.body;
//         if (!['member', 'worker', 'admin'].includes(role)) return res.status(400).json({ success: false, message: 'Invalid role.' });
//         const result = await pool.query('UPDATE users SET role = $1 WHERE id = $2 RETURNING full_name', [role, req.params.id]);
//         await sendNotificationToUser(req.params.id, 'role_change', 'Role Updated', `Your role has been updated to ${role}.`);
//         await logWorkerAction(req.user.id, 'CHANGE_ROLE', `Changed ${result.rows[0]?.full_name} to ${role}`);
//         res.json({ success: true, message: 'Role updated.' });
//     } catch (err) {
//         res.status(500).json({ success: false, message: err.message });
//     }
// });

// // Financial dashboard
// router.get('/financials', adminOnly, async (req, res) => {
//     try {
//         const { month_year } = req.query;
//         const period = month_year || new Date().toISOString().slice(0, 7);
//         const [summary, paid, unpaid, history] = await Promise.all([
//             pool.query("SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count FROM payments WHERE status='successful' AND month_year=$1", [period]),
//             pool.query("SELECT u.full_name, u.email, p.amount, p.created_at FROM payments p JOIN users u ON u.id=p.user_id WHERE p.status='successful' AND p.month_year=$1 ORDER BY p.created_at DESC", [period]),
//             pool.query("SELECT u.full_name, u.email FROM users u WHERE u.role IN ('member','worker','admin') AND u.status='active' AND u.id NOT IN (SELECT user_id FROM payments WHERE status='successful' AND month_year=$1)", [period]),
//             pool.query("SELECT u.full_name, p.type, p.amount, p.status, p.month_year, p.created_at FROM payments p JOIN users u ON u.id=p.user_id ORDER BY p.created_at DESC LIMIT 100")
//         ]);
//         res.json({ success: true, period, summary: summary.rows[0], paid: paid.rows, unpaid: unpaid.rows, history: history.rows });
//     } catch (err) {
//         res.status(500).json({ success: false, message: err.message });
//     }
// });

// // Set dues amount
// router.post('/dues/set', adminOnly, async (req, res) => {
//     try {
//         const { amount, month_year } = req.body;
//         await pool.query('INSERT INTO dues_settings (amount, month_year, set_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [amount, month_year, req.user.id]);
//         res.json({ success: true, message: 'Dues amount set.' });
//     } catch (err) {
//         res.status(500).json({ success: false, message: err.message });
//     }
// });

// // Send broadcast notification
// router.post('/notify/all', adminOnly, async (req, res) => {
//     try {
//         const { title, message, type } = req.body;
//         await sendNotificationToAll(type || 'broadcast', title, message);
//         await logWorkerAction(req.user.id, 'BROADCAST_NOTIFICATION', title);
//         res.json({ success: true, message: 'Notification sent to all.' });
//     } catch (err) {
//         res.status(500).json({ success: false, message: err.message });
//     }
// });

// // Voice room control
// router.post('/voice-room/toggle', adminOnly, async (req, res) => {
//     try {
//         const { type, action } = req.body;
//         if (action === 'start') {
//             await pool.query("UPDATE voice_rooms SET is_active=false WHERE type=$1", [type]);
//             await pool.query("INSERT INTO voice_rooms (type, is_active, started_by, started_at) VALUES ($1, true, $2, NOW())", [type, req.user.id]);
//             if (type === 'general_prayer') {
//                 await sendNotificationToAll('prayer_room_live', '🙏 Prayer Room is LIVE!', 'The General Prayer Room is now open. Join us now!');
//             }
//         } else {
//             await pool.query("UPDATE voice_rooms SET is_active=false, ended_at=NOW() WHERE type=$1 AND is_active=true", [type]);
//         }
//         await logWorkerAction(req.user.id, `VOICE_ROOM_${action.toUpperCase()}`, type);
//         res.json({ success: true, message: `${type} ${action}ed.` });
//     } catch (err) {
//         res.status(500).json({ success: false, message: err.message });
//     }
// });

// // Worker action logs
// router.get('/logs', adminOnly, async (req, res) => {
//     try {
//         const result = await pool.query(
//             'SELECT w.*, u.full_name FROM worker_action_logs w JOIN users u ON u.id=w.worker_id ORDER BY w.created_at DESC LIMIT 200'
//         );
//         res.json({ success: true, logs: result.rows });
//     } catch (err) {
//         res.status(500).json({ success: false, message: err.message });
//     }
// });

// // Visitor contacts
// router.get('/visitor-contacts', adminOnly, async (req, res) => {
//     try {
//         const result = await pool.query('SELECT * FROM visitor_contacts ORDER BY created_at DESC');
//         res.json({ success: true, contacts: result.rows });
//     } catch (err) {
//         res.status(500).json({ success: false, message: err.message });
//     }
// });

// // Member growth report
// router.get('/reports/growth', adminOnly, async (req, res) => {
//     try {
//         const result = await pool.query(
//             "SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as new_members FROM users WHERE status='active' GROUP BY month ORDER BY month DESC LIMIT 12"
//         );
//         res.json({ success: true, report: result.rows });
//     } catch (err) {
//         res.status(500).json({ success: false, message: err.message });
//     }
// });

// // Delete any content
// router.delete('/content/:table/:id', adminOnly, async (req, res) => {
//     try {
//         const allowed = ['posts', 'post_comments', 'testimonies', 'flyers', 'questions', 'prayer_requests', 'celebration_comments', 'sermons', 'videos'];
//         const { table, id } = req.params;
//         if (!allowed.includes(table)) return res.status(400).json({ success: false, message: 'Invalid content type.' });
//         await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
//         await logWorkerAction(req.user.id, 'DELETE_CONTENT', `Deleted from ${table}: ${id}`);
//         res.json({ success: true, message: 'Content removed.' });
//     } catch (err) {
//         res.status(500).json({ success: false, message: err.message });
//     }
// });

// module.exports = router;
