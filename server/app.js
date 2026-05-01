const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors({ origin: process.env.APP_URL || '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/feed', require('./routes/feed'));
app.use('/api/prayers', require('./routes/prayers'));
app.use('/api/testimonies', require('./routes/testimonies'));
app.use('/api/events', require('./routes/events'));
app.use('/api/giving', require('./routes/giving'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/sermons', require('./routes/sermons'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/members', require('./routes/members'));
app.use('/api/polls', require('./routes/polls'));
app.use('/api/resources', require('./routes/resources'));
app.use('/api/misc', require('./routes/misc'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/login', require('./routes/login'));
app.use('/api/celebrations', require('./routes/celebrations'));

// Serve index.html for all non-API routes (SPA fallback)
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../public/index.html'));
    } else {
        res.status(404).json({ success: false, message: 'Route not found.' });
    }
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Internal server error.' });
});

module.exports = app;
