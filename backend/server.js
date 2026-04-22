const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const nodemailer = require('nodemailer');
const webpush = require('web-push');
const cron = require('node-cron');
const helmet = require('helmet');
const morgan = require('morgan');
const logger = require('./utils/logger');
const { generalLimiter, authLimiter } = require('./middleware/rateLimiter');

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
let transporter;
try {
    transporter = nodemailer.createTransport({
        host: 'smtp.resend.com',
        port: 465,
        secure: true,
        auth: { user: 'resend', pass: process.env.RESEND_API_KEY }
    });
} catch (error) {
    logger.error('[Config Error] Failed to initialize Nodemailer:', error.message);
}

try {
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        webpush.setVapidDetails(
            `mailto:${process.env.EMAIL_FROM_ADDRESS || 'admin@vee.com'}`,
            process.env.VAPID_PUBLIC_KEY,
            process.env.VAPID_PRIVATE_KEY
        );
    } else {
        console.warn('[Config Warn] VAPID keys missing. WebPush will not be functional.');
    }
} catch (error) {
    logger.error('[Config Error] Failed to set VAPID details:', error.message);
}

// --- Middleware ---
app.use(helmet({
    contentSecurityPolicy: false, // Disabled for now to ensure SPA compatibility, follow-up task
    crossOriginEmbedderPolicy: false
}));
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(morgan('combined', { 
    stream: { write: message => logger.info(message.trim()) },
    skip: (req, res) => {
        // Skip logging for noisy polling endpoints
        const noisyEndpoints = [
            '/api/admin/whatsapp/status',
            '/api/users/current/ping',
            '/api/health'
        ];
        return noisyEndpoints.includes(req.originalUrl);
    }
}));
app.use('/api/', generalLimiter);
app.use('/api/auth', authLimiter);
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
app.use('/api/projects', projectsRouter);
app.use('/api/friends', friendsRouter);
app.use('/api/invitations', invitationsRouter);
app.use('/api', checklistsRouter);
app.use('/api', miscRouter);

// --- Health Check ---
app.get('/api/health', (req, res) => {
    try {
        // Check DB connection
        db.prepare('SELECT 1').get();
        res.json({ 
            status: 'ok', 
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: 'connected'
        });
    } catch (error) {
        logger.error('Health check failed:', error);
        res.status(500).json({ status: 'error', database: 'disconnected' });
    }
});

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
                    webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload).catch(e => logger.error('WebPush notification failed:', e));
                });
            }
        }
    } catch (e) {
        logger.error('Cron error:', e);
    }
});

// --- Serve Frontend ---

// Handle static files from the built React app
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// The "catch-all" handler: for any request that doesn't 
// match one above, send back React's index.html file.
app.get(/.*/, (req, res) => {
    // If it's an API request that didn't match any route, don't serve index.html
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API route not found' });
    }
    // Otherwise serve the main SPA index.html
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// --- Global Error Handler ---
app.use((err, req, res, next) => {
    logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
    
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' 
            ? 'Internal Server Error' 
            : err.message
    });
});

// --- Start Server ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
});
