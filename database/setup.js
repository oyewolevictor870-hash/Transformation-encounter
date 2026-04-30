const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'transformation_encounter',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD ,
});

async function setup() {
    console.log('🔧 Setting up database...');
    try {
        const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        await pool.query(schema);
        console.log('✅ Schema created successfully');

        const adminEmail = process.env.ADMIN_EMAIL || 'Admin@transformationencounter.org';
        const adminPass = process.env.ADMIN_PASSWORD || 'Admin@123456';
        const adminName = process.env.ADMIN_NAME || 'Joseph Omikule';

        const existing = await pool.query('SELECT id FROM users WHERE email=$1', [adminEmail]);
        if (existing.rows.length === 0) {
            const hashed = await bcrypt.hash(adminPass, 12);
            await pool.query(
                "INSERT INTO users (full_name, email, password, role, status) VALUES ($1,$2,$3,'admin','active')",
                [adminName, adminEmail, hashed]
            );
            console.log(`✅ Admin account created: ${adminEmail}`);
        } else {
            console.log('ℹ️  Admin account already exists');
        }

        // Seed scripture of the day
        const today = new Date().toISOString().slice(0, 10);
        await pool.query(
            `INSERT INTO scripture_of_day (date, reference, text, reflection)
             VALUES ($1, 'John 3:16', 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.',
             'God''s love is unconditional and everlasting. Rest in His love today.')
             ON CONFLICT (date) DO NOTHING`,
            [today]
        );

        console.log('\n🎉 Database setup complete!');
        console.log(`\n📌 Admin Login:\n   Email: ${adminEmail}\n   Password: ${adminPass}`);
        console.log('\n⚠️  IMPORTANT: Change the admin password after first login!\n');
    } catch (err) {
        console.error('❌ Setup error:', err.message);
    } finally {
        await pool.end();
    }
}

setup();
