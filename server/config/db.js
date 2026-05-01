const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});
pool.on('connect', () => console.log('✅ Connected to PostgreSQL'));
pool.on('error', (err) => console.error('❌ DB error:', err.message));
module.exports = pool;