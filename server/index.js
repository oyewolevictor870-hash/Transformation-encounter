const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const pool = require('./config/db');
const migrate = require('./config/migrate');
require('./jobs/cron');

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Socket.io: Real-time features (chat, voice signaling, notifications)
const connectedUsers = {};

io.on('connection', (socket) => {
    socket.on('user:join', (userId) => {
        connectedUsers[userId] = socket.id;
        socket.userId = userId;
    });

    // Group chat
    socket.on('chat:message', async (data) => {
        try {
            const { userId, content, room } = data;
            const result = await pool.query(
                'INSERT INTO chat_messages (user_id, content, room) VALUES ($1,$2,$3) RETURNING id, created_at',
                [userId, content, room || 'general']
            );
            const user = await pool.query('SELECT full_name, profile_photo FROM users WHERE id=$1', [userId]);
            io.to(room || 'general').emit('chat:message', {
                id: result.rows[0].id,
                content,
                user_id: userId,
                full_name: user.rows[0]?.full_name,
                profile_photo: user.rows[0]?.profile_photo,
                created_at: result.rows[0].created_at
            });
        } catch (err) {
            console.error('Chat error:', err.message);
        }
    });

    socket.on('chat:join', (room) => {
        socket.join(room);
    });

    // Direct messaging
    socket.on('dm:send', async (data) => {
        try {
            const { senderId, receiverId, content } = data;
            await pool.query('INSERT INTO direct_messages (sender_id, receiver_id, content) VALUES ($1,$2,$3)', [senderId, receiverId, content]);
            const receiverSocket = connectedUsers[receiverId];
            if (receiverSocket) {
                io.to(receiverSocket).emit('dm:received', { senderId, content, created_at: new Date() });
            }
        } catch (err) {
            console.error('DM error:', err.message);
        }
    });

    // WebRTC Voice Room Signaling
    socket.on('voice:join', (data) => {
        const { room, userId } = data;
        socket.join(`voice:${room}`);
        socket.to(`voice:${room}`).emit('voice:user-joined', { userId, socketId: socket.id });
    });

    socket.on('voice:offer', (data) => {
        socket.to(data.to).emit('voice:offer', { offer: data.offer, from: socket.id });
    });

    socket.on('voice:answer', (data) => {
        socket.to(data.to).emit('voice:answer', { answer: data.answer, from: socket.id });
    });

    socket.on('voice:ice-candidate', (data) => {
        socket.to(data.to).emit('voice:ice-candidate', { candidate: data.candidate, from: socket.id });
    });

    socket.on('voice:leave', (data) => {
        socket.to(`voice:${data.room}`).emit('voice:user-left', { userId: data.userId });
        socket.leave(`voice:${data.room}`);
    });

    // Real-time notification push
    socket.on('notify:user', (data) => {
        const targetSocket = connectedUsers[data.userId];
        if (targetSocket) {
            io.to(targetSocket).emit('notification', data);
        }
    });

    socket.on('disconnect', () => {
        if (socket.userId) delete connectedUsers[socket.userId];
    });
});

// Make io accessible to routes
app.set('io', io);
app.set('connectedUsers', connectedUsers);

 migrate().then(() => {
    server.listen(PORT, () => {
        console.log(`🔥 Transformation Encounter Server running on port ${PORT}`);
        console.log(`🌐 Open: http://localhost:${PORT}`);
    });
});
