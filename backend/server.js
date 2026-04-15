require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const nodemailer = require('nodemailer');
const webpush = require('web-push');
const cron = require('node-cron');

const db = require('./database');
const injectGlobals = require('./middleware/globals');

// Routers
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const googleRouter = require('./routes/google');
const projectsRouter = require('./routes/projects');
const friendsRouter = require('./routes/friends');
const invitationsRouter = require('./routes/invitations');
const adminRouter = require('./routes/admin');
const miscRouter = require('./routes/misc');
const checklistsRouter = require('./routes/checklists');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// --- Transporter & WebPush Config ---
const transporter = nodemailer.createTransport({
    host: 'smtp.resend.com',
    port: 465,
    secure: true,
    auth: { user: 'resend', pass: process.env.RESEND_API_KEY }
});

webpush.setVapidDetails(
    `mailto:${process.env.EMAIL_FROM_ADDRESS || 'admin@vee.com'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(injectGlobals(io, transporter, webpush));

// Static files
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
app.use('/api/uploads', express.static(uploadDir));

// --- Socket.io ---
io.on('connection', (socket) => {
    socket.on('join_project', (projectId) => {
        socket.join(`project_${projectId}`);
    });
});

// --- Mount Routers ---
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/google', googleRouter);
app.use('/api/admin', adminRouter);
app.use('/api/checklists', checklistsRouter);
app.use('/api', authRouter);
app.use('/api', googleRouter); 
app.use('/api', projectsRouter);
app.use('/api', friendsRouter);
app.use('/api', invitationsRouter);
app.use('/api', miscRouter);
app.use('/api', checklistsRouter);

// --- Cron Job (Reminders) ---
cron.schedule('* * * * *', async () => {
    try {
        const now = new Date();
        const currentDate = now.toISOString().split('T')[0];
        const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:mm

        // Basic reminder logic (simplified for visibility, logic migrated to utils if needed)
        const reminders = db.prepare(`
            SELECT ci.*, u.id as user_id FROM checklist_items ci
            JOIN checklists c ON ci.checklist_id = c.id
            JOIN users u ON c.user_id = u.id
            WHERE ci.reminder_minutes IS NOT NULL AND ci.target_date = ? AND ci.time IS NOT NULL
        `).all(currentDate);

        for (const r of reminders) {
            const taskTime = new Date(`${r.target_date}T${r.time}:00`);
            const remindAt = new Date(taskTime.getTime() - r.reminder_minutes * 60000);
            
            if (now.getHours() === remindAt.getHours() && now.getMinutes() === remindAt.getMinutes()) {
                // Send Push
                const subs = db.prepare('SELECT * FROM web_push_subscriptions WHERE user_id = ?').all(r.user_id);
                subs.forEach(sub => {
                    const payload = JSON.stringify({ title: 'תזכורת למשימה', body: r.content });
                    webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload).catch(e => console.error(e));
                });
            }
        }
    } catch (e) {
        console.error('Cron error:', e);
    }
});

// --- Start Server ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
