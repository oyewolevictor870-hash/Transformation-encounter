const cron = require('node-cron');
const pool = require('../config/db');
const { sendNotificationToUser, sendNotificationToAll } = require('./notifications');

// Auto birthday celebration — runs daily at 7:00 AM
cron.schedule('0 7 * * *', async () => {
    try {
        const today = new Date();
        const month = today.getMonth() + 1;
        const day = today.getDate();
        const birthdays = await pool.query(
            `SELECT id, full_name, profile_photo FROM users WHERE EXTRACT(MONTH FROM birthday)=$1 AND EXTRACT(DAY FROM birthday)=$2 AND status='active'`,
            [month, day]
        );
        for (const member of birthdays.rows) {
            await pool.query(
                `INSERT INTO celebrations (user_id, type, title, message, image_url, is_auto)
                 VALUES ($1,'birthday',$2,$3,$4,true)`,
                [member.id, `Happy Birthday ${member.full_name}! 🎂`,
                `Today we celebrate ${member.full_name}! May God bless you abundantly on your special day. The entire Transformation Encounter family loves and prays for you! 🙏🎉`,
                member.profile_photo]
            );
            await sendNotificationToUser(member.id, 'birthday', '🎂 Happy Birthday!', `The Transformation Encounter family wishes you a blessed birthday, ${member.full_name}!`);
            await sendNotificationToAll('member_birthday', `🎂 It's ${member.full_name}'s Birthday!`, `Join us in celebrating ${member.full_name} today! Send them your love and prayers.`);
        }
        if (birthdays.rows.length > 0) console.log(`🎂 Birthday celebrations created for ${birthdays.rows.length} members`);
    } catch (err) {
        console.error('Birthday cron error:', err.message);
    }
});

// Event reminders — 24 hours before
cron.schedule('0 8 * * *', async () => {
    try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().slice(0, 10);
        const events = await pool.query("SELECT * FROM events WHERE DATE(event_date)=$1", [dateStr]);
        for (const event of events.rows) {
            const rsvps = await pool.query("SELECT user_id FROM event_rsvps WHERE event_id=$1 AND status='attending'", [event.id]);
            for (const rsvp of rsvps.rows) {
                await sendNotificationToUser(rsvp.user_id, 'event_reminder', `⏰ Reminder: ${event.title} Tomorrow`, `Don't forget! "${event.title}" is happening tomorrow. ${event.location ? 'Location: ' + event.location : ''}`);
            }
        }
    } catch (err) {
        console.error('Event 24hr reminder error:', err.message);
    }
});

// Event reminders — 1 hour before
cron.schedule('0 * * * *', async () => {
    try {
        const soon = new Date(Date.now() + 60 * 60 * 1000);
        const events = await pool.query("SELECT * FROM events WHERE event_date BETWEEN NOW() AND $1", [soon]);
        for (const event of events.rows) {
            const rsvps = await pool.query("SELECT user_id FROM event_rsvps WHERE event_id=$1 AND status='attending'", [event.id]);
            for (const rsvp of rsvps.rows) {
                await sendNotificationToUser(rsvp.user_id, 'event_reminder_1hr', `⏰ Starting in 1 Hour: ${event.title}`, `"${event.title}" is starting in 1 hour! Get ready.`);
            }
        }
    } catch (err) {
        console.error('Event 1hr reminder error:', err.message);
    }
});

// Publish scheduled posts
cron.schedule('* * * * *', async () => {
    try {
        await pool.query("UPDATE posts SET is_published=true, published_at=NOW() WHERE is_published=false AND scheduled_at IS NOT NULL AND scheduled_at <= NOW()");
    } catch (err) {
        console.error('Scheduled posts error:', err.message);
    }
});

// Daily devotional morning notification at 6 AM
cron.schedule('0 6 * * *', async () => {
    try {
        const devotional = await pool.query("SELECT * FROM posts WHERE type='devotional' AND DATE(published_at)=CURRENT_DATE LIMIT 1");
        if (devotional.rows.length) {
            await sendNotificationToAll('devotional', '📖 Today\'s Devotional is Ready', `Good morning! Start your day with God's word. Today's devotional: "${devotional.rows[0].title}"`);
        }
    } catch (err) {
        console.error('Devotional notification error:', err.message);
    }
});

console.log('✅ Cron jobs initialized');

module.exports = {};
