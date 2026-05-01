const path = require('path');
const fs = require('fs');
const pool = require('./db');

const migrate = async () => {
    try {
        const schemaPath = path.join(__dirname, '../../database/schema.sql');
        if (!fs.existsSync(schemaPath)) return;
        const schema = fs.readFileSync(schemaPath, 'utf8');
        await pool.query(schema);
        console.log('✅ Database tables ready');

        const bcrypt = require('bcryptjs');
        const adminEmail = 'admin@transformationencounter.org';
        const existing = await pool.query('SELECT id FROM users WHERE email=$1', [adminEmail]);
        if (existing.rows.length === 0) {
            const hashed = await bcrypt.hash('Admin@1234', 12);
            await pool.query(
                `INSERT INTO users (full_name, email, password, role, status, onboarding_complete)
                 VALUES ($1,$2,$3,'admin','active',true)`,
                ['Admin', adminEmail, hashed]
            );
            console.log('✅ Admin account created');
        }
    } catch (err) {
        console.error('❌ Migration error:', err.message);
    }
};

module.exports = migrate;
