require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const crypto = require('crypto');
const db = require('./database');
const http = require('http');
const { Server } = require('socket.io');
const nodemailer = require('nodemailer');
const webpush = require('web-push');
const cron = require('node-cron');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

io.on('connection', (socket) => {
    socket.on('join_project', (projectId) => {
        socket.join(`project_${projectId}`);
    });
});

app.use(cors());
app.use(express.json());

// Set up static serving for uploaded images
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
app.use('/api/uploads', express.static(uploadDir));

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    }
});

// --- Web Push Configuration ---
const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;
webpush.setVapidDetails(`mailto:${process.env.EMAIL_FROM_ADDRESS || 'test@example.com'}`, publicVapidKey, privateVapidKey);

// --- Email Sending Service ---
const transporter = nodemailer.createTransport({
    host: 'smtp.resend.com',
    port: 465,
    secure: true,
    auth: {
        user: 'resend',
        pass: process.env.RESEND_API_KEY
    }
});

const generateInvitationEmailHtml = (inviterName, inviteLink) => `
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>הזמנה ל-Vee</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; margin: 0; padding: 0; direction: rtl;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
            <div style="background-color: rgba(255,255,255,0.2); width: 80px; height: 80px; border-radius: 50%; display: inline-flex; justify-content: center; align-items: center; margin-bottom: 20px;">
                <span style="font-size: 40px;">✨</span>
            </div>
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800;">הוזמנת להצטרף ל-Vee!</h1>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px; text-align: center;">
            <p style="font-size: 18px; color: #374151; line-height: 1.6; margin-bottom: 30px;">
                היי! <strong>${inviterName}</strong> שלח/ה לך הזמנה אישית להצטרף אליו למערכת ניהול המשימות והפרויקטים החברתית - Vee.
            </p>
            
            <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
                 <p style="margin: 0; color: #64748b; font-size: 15px;">ההזמנה הזו תקפה ל-7 ימים בלבד.</p>
            </div>

            <a href="${inviteLink}" style="display: inline-block; background: #10b981; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4); transition: transform 0.2s;">
                קבל/י את ההזמנה עכשיו
            </a>
            
            <p style="margin-top: 40px; font-size: 14px; color: #94a3b8;">
                אם הכפתור לא עובד, עותק/י את הקישור הבא לדפדפן שלך:<br>
                <a href="${inviteLink}" style="color: #6366f1; word-break: break-all;">${inviteLink}</a>
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; font-size: 13px; color: #94a3b8;">
                נשלח ממערכת Vee.
            </p>
        </div>
    </div>
</body>
</html>
`;


// --- Users API ---
const hashPassword = (pw) => crypto.createHash('sha256').update(pw).digest('hex');

function calculateNextOccurrence(targetDate, rule) {
    if (!targetDate || !rule || rule === 'none') return null;

    const date = new Date(targetDate);
    if (isNaN(date.getTime())) return null;

    switch (rule) {
        case 'daily':
            date.setDate(date.getDate() + 1);
            break;
        case 'weekly':
            date.setDate(date.getDate() + 7);
            break;
        case 'weekdays':
            // Israeli week: Sun-Thu (0-4)
            const day = date.getDay();
            if (day === 4) date.setDate(date.getDate() + 3); // Thu -> Sun
            else if (day === 5) date.setDate(date.getDate() + 2); // Fri -> Sun
            else if (day === 6) date.setDate(date.getDate() + 1); // Sat -> Sun
            else date.setDate(date.getDate() + 1);
            break;
        case 'monthly':
            date.setMonth(date.getMonth() + 1);
            break;
        case 'yearly':
            date.setFullYear(date.getFullYear() + 1);
            break;
        default:
            return null;
    }
    return date.toISOString().split('T')[0];
}

function isOccurrenceOnDate(dateStr, startDateStr, rule) {
    if (!rule || rule === 'none') return false;
    
    // If no start date, we assume it starts today
    const startStr = startDateStr || new Date().toISOString().split('T')[0];
    
    // Rule: Must not be before start date
    if (dateStr < startStr) return false;
    if (dateStr === startStr) return true;

    const date = new Date(dateStr);
    const start = new Date(startStr);
    
    switch (rule) {
        case 'daily':
            return true;
        case 'weekdays':
            const dow = date.getDay();
            return dow >= 0 && dow <= 4; // Sun-Thu
        case 'weekly':
            // Same day of week
            return date.getDay() === start.getDay();
        case 'monthly':
            // Same day of month
            return date.getDate() === start.getDate();
        case 'yearly':
            // Same day and month
            return date.getDate() === start.getDate() && date.getMonth() === start.getMonth();
        default:
            return false;
    }
}

// POST /api/users — legacy quick-create (kept for back-compat)
app.post('/api/users', (req, res) => {
    const { username } = req.body;
    if (!username || username.trim() === '') {
        return res.status(400).json({ error: 'Username is required' });
    }
    try {
        const insert = db.prepare('INSERT INTO users (username) VALUES (?)');
        const result = insert.run(username.trim());
        const newUserId = result.lastInsertRowid;
        // Create default inbox
        db.prepare("INSERT INTO checklists (title, user_id, project_id) VALUES ('', ?, NULL)").run(newUserId);
        res.json({ id: newUserId, username: username.trim() });
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim());
            return res.json(user);
        }
        res.status(500).json({ error: 'Database error' });
    }
});

// POST /api/auth/register
app.post('/api/auth/register', (req, res) => {
    const { identifier, password, display_name, invite_token } = req.body; // identifier = email / phone / username
    if (!identifier || !password) return res.status(400).json({ error: 'חסרים פרטים' });
    const isEmail = /^[^@]+@[^@]+\.[^@]+$/.test(identifier);
    const isPhone = /^[0-9+\-() ]{7,15}$/.test(identifier.replace(/\s/g, ''));
    const username = display_name || identifier.split('@')[0].replace(/[^a-zA-Z0-9א-ת]/g, '');
    const email = isEmail ? identifier : null;
    const phone = isPhone && !isEmail ? identifier : null;
    const hash = hashPassword(password);

    // Check invite token if provided
    let inviterId = null;
    let inviteId = null;
    if (invite_token) {
        const invite = db.prepare('SELECT id, inviter_id, expires_at, used_at FROM invitations WHERE token = ?').get(invite_token);
        if (invite && !invite.used_at && new Date() <= new Date(invite.expires_at)) {
            inviterId = invite.inviter_id;
            inviteId = invite.id;
        }
    }

    try {
        const result = db.prepare(
            'INSERT INTO users (username, email, phone, password_hash, invited_by) VALUES (?, ?, ?, ?, ?)'
        ).run(username, email, phone, hash, inviterId);

        const newUserId = result.lastInsertRowid;

        db.transaction(() => {
            // Create default Inbox list for new user
            db.prepare("INSERT INTO checklists (title, user_id, project_id) VALUES ('', ?, NULL)").run(newUserId);
            // Process invitation acceptance if valid
            if (inviteId && inviterId) {
                db.prepare('UPDATE invitations SET used_at = CURRENT_TIMESTAMP WHERE id = ?').run(inviteId);
                // Create instant friendship
                const existingFriendship = db.prepare('SELECT id FROM friends WHERE (requester_id = ? AND receiver_id = ?) OR (requester_id = ? AND receiver_id = ?)').get(inviterId, newUserId, newUserId, inviterId);
                if (!existingFriendship) {
                    db.prepare("INSERT INTO friends (requester_id, receiver_id, status) VALUES (?, ?, 'accepted')").run(inviterId, newUserId);
                }
            }
        })();

        try {
            db.prepare('INSERT INTO user_logs (user_id, admin_id, action, details) VALUES (?, ?, ?, ?)').run(
                newUserId, null, 'ACCOUNT_CREATED', 'חשבון המשתמש נוצר בהצלחה'
            );
        } catch (e) {
            console.error('Failed to log account creation', e);
        }

        const user = db.prepare('SELECT id, username, email, phone, profile_image FROM users WHERE id = ?').get(newUserId);
        user.invited_users = [];
        res.json({ success: true, user });
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(409).json({ error: 'המשתמש כבר קיים. נסה להתחבר.' });
        }
        console.error('Registration error:', err);
        res.status(500).json({ error: 'שגיאת שרת', details: err.message });
    }
});

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
    const { identifier, password, invite_token } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

    if (!identifier || !password) return res.status(400).json({ error: 'חסרים פרטים' });
    const hash = hashPassword(password);

    const potentialUser = db.prepare('SELECT id FROM users WHERE email = ? OR phone = ? OR username = ?').get(identifier, identifier, identifier);

    const user = db.prepare(
        `SELECT id, username, email, phone, profile_image, invited_by, whatsapp_enabled FROM users
         WHERE password_hash = ? AND (email = ? OR phone = ? OR username = ?)`
    ).get(hash, identifier, identifier, identifier);

    if (!user) {
        try {
            db.prepare('INSERT INTO login_logs (user_id, identifier_attempted, status, ip_address) VALUES (?, ?, ?, ?)').run(
                potentialUser ? potentialUser.id : null,
                identifier,
                'failed',
                ip
            );
        } catch (e) {
            console.error('Error logging failed login', e);
        }
        return res.status(401).json({ error: 'פרטי התחברות שגויים' });
    }

    try {
        db.prepare('INSERT INTO login_logs (user_id, identifier_attempted, status, ip_address) VALUES (?, ?, ?, ?)').run(
            user.id,
            identifier,
            'success',
            ip
        );

        // Process invite if logging in using a link
        let inviterId = null;
        if (invite_token) {
            const invite = db.prepare('SELECT id, inviter_id, expires_at, used_at FROM invitations WHERE token = ?').get(invite_token);
            if (invite && !invite.used_at && new Date() <= new Date(invite.expires_at)) {
                inviterId = invite.inviter_id;

                db.transaction(() => {
                    db.prepare('UPDATE invitations SET used_at = CURRENT_TIMESTAMP WHERE id = ?').run(invite.id);

                    // Update user's affiliation if they don't have one
                    if (!user.invited_by) {
                        db.prepare('UPDATE users SET invited_by = ? WHERE id = ?').run(inviterId, user.id);
                    }

                    // Create instant friendship
                    const existingFriendship = db.prepare('SELECT id FROM friends WHERE (requester_id = ? AND receiver_id = ?) OR (requester_id = ? AND receiver_id = ?)').get(inviterId, user.id, user.id, inviterId);
                    if (!existingFriendship) {
                        db.prepare("INSERT INTO friends (requester_id, receiver_id, status) VALUES (?, ?, 'accepted')").run(inviterId, user.id);
                    } else {
                        // Upgrade to accepted if it was pending
                        db.prepare("UPDATE friends SET status = 'accepted' WHERE id = ?").run(existingFriendship.id);
                    }
                })();
            }
        }

        let updateQuery = 'UPDATE users SET last_active_at = CURRENT_TIMESTAMP';
        const params = [];

        // If they logged in with an email but their account email is empty, save the email
        const isEmail = /^[^@]+@[^@]+\.[^@]+$/.test(identifier);
        let updatedEmail = false;
        if (isEmail && !user.email) {
            updateQuery += ', email = ?';
            params.push(identifier);
            user.email = identifier; // fast update of the return object
            updatedEmail = true;
        }

        updateQuery += ' WHERE id = ?';
        params.push(user.id);

        db.prepare(updateQuery).run(...params);

        if (updatedEmail) {
            try {
                db.prepare('INSERT INTO user_logs (user_id, admin_id, action, details) VALUES (?, ?, ?, ?)').run(
                    user.id, null, 'EMAIL_CHANGED', `עדכון אימייל אוטומטי מהתחברות: '${identifier}'`
                );
            } catch (e) { console.error('Failed to log automatic email update', e); }
        }

    } catch (e) {
        console.error('Error logging successful login or updating user', e);
    }

    try {
        user.invited_users = db.prepare('SELECT id, username, profile_image, created_at FROM users WHERE invited_by = ? ORDER BY created_at DESC').all(user.id);
    } catch (e) {
        user.invited_users = [];
    }

    res.json({ success: true, user });
});

// POST /api/users/:id/ping
app.post('/api/users/:id/ping', (req, res) => {
    try {
        const result = db.prepare('UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
        if (result.changes === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ success: true });
    } catch (error) {
        console.error('Ping error:', error);
        res.status(500).json({ error: 'Failed to record ping' });
    }
});

// --- Admin Auth ---
app.post('/api/admin/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'חסרים פרטים' });
    const hash = hashPassword(password);

    try {
        const admin = db.prepare('SELECT id, email FROM admins WHERE email = ? AND password_hash = ?').get(email, hash);
        if (!admin) return res.status(401).json({ error: 'פרטי התחברות שגויים' });

        // Generate a random token
        const token = crypto.randomBytes(32).toString('hex');
        db.prepare('UPDATE admins SET token = ? WHERE id = ?').run(token, admin.id);

        res.json({ success: true, token, admin: { id: admin.id, email: admin.email } });
    } catch (err) {
        console.error('Admin login error:', err);
        res.status(500).json({ error: 'שגיאת שרת' });
    }
});

// Admin Auth Middleware
const adminAuth = (req, res, next) => {
    const token = req.header('Admin-Token');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const admin = db.prepare('SELECT id FROM admins WHERE token = ?').get(token);
        if (!admin) return res.status(401).json({ error: 'Unauthorized' });
        req.admin = admin;
        next();
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
};

app.get('/api/admin/whatsapp/status', adminAuth, (req, res) => {
    try {
        const STATUS_FILE = path.join(__dirname, 'whatsapp_status.json');
        if (fs.existsSync(STATUS_FILE)) {
            const data = fs.readFileSync(STATUS_FILE, 'utf8');
            res.setHeader('Content-Type', 'application/json');
            return res.send(data);
        } else {
            return res.json({ status: 'INITIALIZING', qr: null });
        }
    } catch (err) {
        console.error('Error reading whatsapp status:', err);
        return res.status(500).json({ error: 'Server error reading status' });
    }
});

app.get('/api/admin/whatsapp/logs', adminAuth, (req, res) => {
    try {
        const logs = db.prepare(`
            SELECT wl.*, u.username 
            FROM whatsapp_logs wl
            LEFT JOIN users u ON wl.user_id = u.id
            ORDER BY wl.created_at DESC
            LIMIT 100
        `).all();
        res.json(logs);
    } catch (err) {
        console.error('Error fetching WA logs', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/admin/settings/:key', adminAuth, (req, res) => {
    try {
        const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get(req.params.key);
        if (!setting) {
            return res.status(404).json({ error: 'Setting not found' });
        }
        res.json({ key: req.params.key, value: setting.value });
    } catch (err) {
        console.error('Error fetching setting:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/admin/settings', adminAuth, (req, res) => {
    const { key, value } = req.body;
    if (!key || value === undefined) {
        return res.status(400).json({ error: 'Missing key or value' });
    }

    try {
        db.prepare(`
            INSERT INTO settings (key, value) 
            VALUES (?, ?) 
            ON CONFLICT(key) DO UPDATE SET value = ?
        `).run(key, value, value);
        
        res.json({ success: true, key, value });
    } catch (err) {
        console.error('Error updating setting:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/users/:id', (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    try {
        user.invited_users = db.prepare('SELECT id, username, profile_image, created_at FROM users WHERE invited_by = ? ORDER BY created_at DESC').all(req.params.id);
    } catch (e) {
        user.invited_users = [];
    }

    res.json(user);
});

app.put('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const { username, profile_image, email, password, phone, whatsapp_enabled } = req.body;

    if (!username || username.trim() === '') {
        return res.status(400).json({ error: 'Username is required' });
    }

    try {
        const oldUser = db.prepare('SELECT username, email FROM users WHERE id = ?').get(id);

        let updateQuery = 'UPDATE users SET username = ?';
        const params = [username.trim()];

        if (profile_image !== undefined) {
            updateQuery += ', profile_image = ?';
            params.push(profile_image);
        }

        if (email !== undefined) {
            updateQuery += ', email = ?';
            params.push(email);
        }

        if (phone !== undefined) {
            updateQuery += ', phone = ?';
            params.push(phone);
        }

        if (whatsapp_enabled !== undefined) {
            updateQuery += ', whatsapp_enabled = ?';
            params.push(whatsapp_enabled ? 1 : 0);
        }

        if (password) {
            updateQuery += ', password_hash = ?';
            params.push(hashPassword(password));
        }

        updateQuery += ' WHERE id = ?';
        params.push(id);

        db.prepare(updateQuery).run(...params);

        if (oldUser && oldUser.username !== username.trim()) {
            db.prepare(
                'INSERT INTO user_logs (user_id, admin_id, action, details) VALUES (?, ?, ?, ?)'
            ).run(
                id,
                null,
                'USERNAME_CHANGED',
                `עדכון שם משתמש: מ-'${oldUser.username}' ל-'${username.trim()}'`
            );
        }

        if (oldUser && email !== undefined && oldUser.email !== email) {
            db.prepare(
                'INSERT INTO user_logs (user_id, admin_id, action, details) VALUES (?, ?, ?, ?)'
            ).run(
                id,
                null,
                'EMAIL_CHANGED',
                `עדכון אימייל: מ-'${oldUser.email || 'ריק'}' ל-'${email || 'ריק'}'`
            );
        }

        if (password) {
            db.prepare(
                'INSERT INTO user_logs (user_id, admin_id, action, details) VALUES (?, ?, ?, ?)'
            ).run(
                id,
                null,
                'PASSWORD_CHANGED',
                `המשתמש שינה את סיסמתו`
            );
        }

        const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
        res.json(updatedUser);
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(409).json({ error: 'Username already exists' });
        }
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// --- Friends API ---
app.get('/api/users/search', (req, res) => {
    const { q, excludeUserId } = req.query;
    if (!q) return res.json([]);
    try {
        const users = db.prepare(`
            SELECT id, username, profile_image, email 
            FROM users 
            WHERE (username LIKE ? OR email LIKE ?) AND id != ?
            LIMIT 10
        `).all(`%${q}%`, `%${q}%`, excludeUserId || 0);
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Search failed' });
    }
});

app.get('/api/users/:userId/friends', (req, res) => {
    const { userId } = req.params;
    try {
        const friends = db.prepare(`
            SELECT 
                f.id as request_id, f.status, f.requester_id, f.receiver_id,
                u.id as user_id, u.username, u.profile_image
            FROM friends f
            JOIN users u ON (u.id = CASE WHEN f.requester_id = ? THEN f.receiver_id ELSE f.requester_id END)
            WHERE f.requester_id = ? OR f.receiver_id = ?
        `).all(userId, userId, userId);
        res.json(friends);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch friends' });
    }
});

app.post('/api/friends/request', (req, res) => {
    const { requester_id, receiver_id } = req.body;
    try {
        // Only insert if no request exists in either direction
        const existing = db.prepare('SELECT id FROM friends WHERE (requester_id = ? AND receiver_id = ?) OR (requester_id = ? AND receiver_id = ?)').get(requester_id, receiver_id, receiver_id, requester_id);
        if (existing) return res.status(400).json({ error: 'Request already exists' });

        const result = db.prepare('INSERT INTO friends (requester_id, receiver_id) VALUES (?, ?)').run(requester_id, receiver_id);
        res.json({ id: result.lastInsertRowid, status: 'pending' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to send friend request' });
    }
});

app.put('/api/friends/accept/:requestId', (req, res) => {
    try {
        db.prepare("UPDATE friends SET status = 'accepted' WHERE id = ?").run(req.params.requestId);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to accept friend request' });
    }
});

app.delete('/api/friends/:requestId', (req, res) => {
    try {
        db.prepare("DELETE FROM friends WHERE id = ?").run(req.params.requestId);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to remove friend or request' });
    }
});

// --- Invitations API ---
app.post('/api/invitations', async (req, res) => {
    const { inviter_id, emails } = req.body;
    if (!inviter_id || !emails || !Array.isArray(emails) || emails.length === 0) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    if (emails.length > 10) {
        return res.status(400).json({ error: 'ניתן לשלוח עד 10 הזמנות בכל פעם' });
    }

    try {
        const inviter = db.prepare('SELECT username FROM users WHERE id = ?').get(inviter_id);
        if (!inviter) return res.status(404).json({ error: 'User not found' });

        const baseUrl = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:5173';
        const successfulEmails = [];
        const failedEmails = [];

        // Note: For production Resend free tier we might need a verified domain to use as 'from'.
        // By default Resend let's us use 'onboarding@resend.dev' for testing purposes, but only to our own verified email address.
        // Assuming the user verified their domain in Resend to send to anyone, we use a generic from address.
        // If not, Resend will throw an error and we catch it below.

        for (const email of emails) {
            // Trim and basic validate
            const cleanEmail = email.trim();
            if (!/^[^@]+@[^@]+\.[^@]+$/.test(cleanEmail)) {
                failedEmails.push({ email: cleanEmail, reason: 'Invalid email format' });
                continue;
            }

            // Check if already registered
            const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
            if (existingUser) {
                failedEmails.push({ email: cleanEmail, reason: 'Already registered' });
                continue;
            }

            const token = crypto.randomBytes(32).toString('hex');
            // Expire in 7 days
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);

            // DB insertion
            db.prepare('INSERT INTO invitations (inviter_id, email, token, expires_at) VALUES (?, ?, ?, ?)').run(
                inviter_id,
                cleanEmail,
                token,
                expiresAt.toISOString()
            );

            const inviteLink = `${baseUrl}/?invite_token=${token}`;
            const html = generateInvitationEmailHtml(inviter.username, inviteLink);

            try {
                await transporter.sendMail({
                    from: process.env.EMAIL_FROM || 'Vee <onboarding@resend.dev>',
                    to: cleanEmail,
                    subject: `${inviter.username} הזמין/ה אותך להצטרף ל-Vee!`,
                    html: html
                });
                successfulEmails.push(cleanEmail);
            } catch (emailErr) {
                console.error('Nodemailer send failed for', cleanEmail, emailErr);
                failedEmails.push({ email: cleanEmail, reason: 'Email delivery failed' });
            }
        }

        res.json({ success: true, sent: successfulEmails.length, successful: successfulEmails, failed: failedEmails });
    } catch (err) {
        console.error('Invitation generation error:', err);
        res.status(500).json({ error: 'שגיאת שרת ביצירת ההזמנות' });
    }
});

app.get('/api/invitations/verify/:token', (req, res) => {
    const { token } = req.params;
    try {
        const invite = db.prepare(`
            SELECT i.*, u.username as inviter_name, u.profile_image as inviter_image 
            FROM invitations i
            JOIN users u ON i.inviter_id = u.id
            WHERE i.token = ?
        `).get(token);

        if (!invite) {
            return res.status(404).json({ error: 'הזמנה זו לא קיימת או שגויה.' });
        }

        if (invite.used_at) {
            return res.status(400).json({ error: 'כבר נעשה שימוש בהזמנה זו.' });
        }

        const now = new Date();
        const expires = new Date(invite.expires_at);
        if (now > expires) {
            return res.status(400).json({ error: 'פג תוקפה של ההזמנה.' });
        }

        res.json({
            valid: true,
            email: invite.email,
            inviter: {
                id: invite.inviter_id,
                name: invite.inviter_name,
                image: invite.inviter_image
            }
        });
    } catch (err) {
        console.error('Verify token err:', err);
        res.status(500).json({ error: 'שגיאת שרת בבדיקת ההזמנה' });
    }
});


// --- File Upload API ---
app.post('/api/upload', (req, res) => {
    upload.single('image')(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'הקובץ גדול מדי (מקסימום 5MB)' });
            }
            return res.status(400).json({ error: `שגיאת העלאה: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ error: err.message === 'Only images are allowed' ? 'ניתן להעלות קבצי תמונה בלבד' : err.message });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'לא נבחרה תמונה' });
        }

        const imageUrl = `/uploads/${req.file.filename}`;
        res.json({ url: imageUrl });
    });
});

// --- Templates API ---
app.get('/api/templates', (req, res) => {
    const templates = db.prepare('SELECT * FROM templates').all();
    for (let t of templates) {
        t.items = db.prepare('SELECT * FROM template_items WHERE template_id = ?').all(t.id);
    }
    res.json(templates);
});

// --- Projects API ---
app.get('/api/users/:userId/projects', (req, res) => {
    const { userId } = req.params;
    const projects = db.prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY order_index ASC, created_at ASC').all(userId);
    res.json(projects);
});

app.post('/api/users/:userId/projects', (req, res) => {
    const { userId } = req.params;
    const { title, color, parent_id, description } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    try {
        const projectColor = color || '#6366f1';
        const parentId = parent_id || null;

        const maxOrder = db.prepare('SELECT MAX(order_index) as maxOrder FROM projects WHERE user_id = ?').get(userId);
        const nextOrder = (maxOrder.maxOrder || 0) + 1;

        const result = db.prepare(
            'INSERT INTO projects (user_id, title, color, parent_id, order_index, description) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(userId, title, projectColor, parentId, nextOrder, description || null);
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);

        try {
            db.prepare('INSERT INTO user_logs (user_id, admin_id, action, details) VALUES (?, ?, ?, ?)').run(
                userId, null, 'PROJECT_CREATED', `יצירת פרויקט חדש: '${title}'`
            );
        } catch (e) { console.error('Failed to log project creation', e); }

        res.json(project);
    } catch (err) {
        console.error('Failed to create project:', err);
        res.status(500).json({ error: 'Failed to create project' });
    }
});

// Reorder Projects
app.put('/api/users/:userId/projects/reorder', (req, res) => {
    const { userId } = req.params;
    const { projectIds } = req.body; // Array of project IDs in the new sorted order

    if (!Array.isArray(projectIds)) {
        return res.status(400).json({ error: 'projectIds array is required' });
    }

    try {
        const updateOrder = db.prepare('UPDATE projects SET order_index = ? WHERE id = ? AND user_id = ?');

        db.transaction(() => {
            projectIds.forEach((id, index) => {
                updateOrder.run(index, id, userId);
            });
        })();

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Project reorder failed' });
    }
});

app.get('/api/projects/:id', (req, res) => {
    const { id } = req.params;
    try {
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const checklists = db.prepare('SELECT * FROM checklists WHERE project_id = ? ORDER BY order_index ASC, created_at DESC').all(id);
        for (let c of checklists) {
            c.items = db.prepare('SELECT *, (SELECT COUNT(*) FROM checklist_item_comments WHERE checklist_item_id = checklist_items.id) AS comments_count FROM checklist_items WHERE checklist_id = ? ORDER BY order_index ASC').all(c.id);
        }

        const comments = db.prepare(`
            SELECT pc.*, u.username, u.profile_image 
            FROM project_comments pc 
            JOIN users u ON pc.user_id = u.id 
            WHERE pc.project_id = ? 
            ORDER BY pc.created_at ASC
        `).all(id);

        res.json({ project, checklists, comments });
    } catch (err) {
        console.error('Failed to fetch project:', err);
        res.status(500).json({ error: 'Failed to fetch project' });
    }
});

app.put('/api/projects/:id', (req, res) => {
    const { id } = req.params;
    const { title, color, parent_id, description } = req.body;
    try {
        const oldProject = db.prepare('SELECT user_id, title FROM projects WHERE id = ?').get(id);

        const updates = [];
        const params = [];

        if (title !== undefined) { updates.push('title = ?'); params.push(title); }
        if (color !== undefined) { updates.push('color = ?'); params.push(color); }
        if (parent_id !== undefined) { updates.push('parent_id = ?'); params.push(parent_id === null ? null : Number(parent_id)); }
        if (description !== undefined) { updates.push('description = ?'); params.push(description); }

        if (updates.length > 0) {
            params.push(id);
            db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(...params);
        }

        if (oldProject && title !== undefined && oldProject.title !== title) {
            try {
                db.prepare('INSERT INTO user_logs (user_id, admin_id, action, details) VALUES (?, ?, ?, ?)').run(
                    oldProject.user_id, null, 'PROJECT_UPDATED', `עדכון שם פרויקט: מ-'${oldProject.title}' ל-'${title}'`
                );
            } catch (e) { console.error('Failed to log project update', e); }
        }

        if (oldProject && description !== undefined) {
            try {
                db.prepare('INSERT INTO user_logs (user_id, admin_id, action, details) VALUES (?, ?, ?, ?)').run(
                    oldProject.user_id, null, 'PROJECT_UPDATED', `עדכון תיאור פרויקט '${oldProject.title}'`
                );
            } catch (e) { console.error('Failed to log project description update', e); }
        }

        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
        res.json(project);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update project' });
    }
});

app.get('/api/projects/:projectId/history', (req, res) => {
    const { projectId } = req.params;
    const { startDate, endDate } = req.query; // e.g. 2024-01-01 to 2024-01-31

    try {
        // Find all checklist items belonging to this project
        // Then query daily_progress for those items within the date range
        // We will return an array of { date: 'YYYY-MM-DD', totalTasks: X, completedTasks: Y }

        const historyQuery = db.prepare(`
            SELECT 
                dp.date,
                COUNT(ci.id) as totalTasks,
                SUM(CASE WHEN dp.completed = 1 THEN 1 ELSE 0 END) as completedTasks
            FROM checklists c
            JOIN checklist_items ci ON c.id = ci.checklist_id
            JOIN daily_progress dp ON ci.id = dp.checklist_item_id
            WHERE c.project_id = ? AND dp.date >= ? AND dp.date <= ?
            GROUP BY dp.date
            ORDER BY dp.date ASC
        `);

        const historyData = historyQuery.all(projectId, startDate, endDate);
        res.json(historyData);
    } catch (err) {
        console.error('History fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch project history' });
    }
});

app.delete('/api/projects/:id', (req, res) => {
    try {
        const oldProject = db.prepare('SELECT user_id, title FROM projects WHERE id = ?').get(req.params.id);

        db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);

        if (oldProject) {
            try {
                db.prepare('INSERT INTO user_logs (user_id, admin_id, action, details) VALUES (?, ?, ?, ?)').run(
                    oldProject.user_id, null, 'PROJECT_DELETED', `מחיקת פרויקט: '${oldProject.title}'`
                );
            } catch (e) { console.error('Failed to log project deletion', e); }
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete project' });
    }
});

// --- Project Comments API ---
app.get('/api/projects/:projectId/comments', (req, res) => {
    const { projectId } = req.params;
    try {
        const comments = db.prepare(`
            SELECT c.*, u.username, u.profile_image 
            FROM project_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.project_id = ?
            ORDER BY c.created_at ASC
        `).all(projectId);
        res.json(comments);
    } catch (err) {
        console.error('Failed to fetch comments:', err);
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
});

app.post('/api/projects/:projectId/comments', (req, res) => {
    const { projectId } = req.params;
    const { user_id, content } = req.body;

    if (!user_id || !content || content.trim() === '') {
        return res.status(400).json({ error: 'User ID and content are required' });
    }

    try {
        const result = db.prepare('INSERT INTO project_comments (project_id, user_id, content) VALUES (?, ?, ?)')
            .run(projectId, user_id, content.trim());

        const newComment = db.prepare(`
            SELECT c.*, u.username, u.profile_image 
            FROM project_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.id = ?
        `).get(result.lastInsertRowid);

        res.json(newComment);
    } catch (err) {
        console.error('Failed to add comment:', err);
        res.status(500).json({ error: 'Failed to add comment' });
    }
});

// --- Checklists API ---
app.get('/api/projects/:projectId/checklists', (req, res) => {
    const { projectId } = req.params;
    const checklists = db.prepare('SELECT * FROM checklists WHERE project_id = ? ORDER BY order_index ASC, created_at DESC').all(projectId);
    for (let c of checklists) {
        c.items = db.prepare(`
            SELECT ci.*, 
                   (SELECT MAX(dp.date) FROM daily_progress dp WHERE dp.checklist_item_id = ci.id AND dp.completed = 1) as last_completed_date,
                   (SELECT COUNT(*) FROM checklist_item_comments WHERE checklist_item_id = ci.id) as comments_count
            FROM checklist_items ci 
            WHERE ci.checklist_id = ? 
            ORDER BY order_index ASC
        `).all(c.id);
    }
    res.json(checklists);
});

// Reorder Checklists within a Project
app.put('/api/projects/:projectId/checklists/reorder', (req, res) => {
    const { projectId } = req.params;
    const { checklistIds } = req.body; // Array of checklist IDs in the new sorted order

    if (!Array.isArray(checklistIds)) {
        return res.status(400).json({ error: 'checklistIds array is required' });
    }

    try {
        const updateOrder = db.prepare('UPDATE checklists SET order_index = ? WHERE id = ? AND project_id = ?');

        db.transaction(() => {
            checklistIds.forEach((id, index) => {
                updateOrder.run(index, id, projectId);
            });
        })();

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Checklist reorder failed' });
    }
});

app.get('/api/users/:userId/checklists', (req, res) => {
    const { userId } = req.params;
    const checklists = db.prepare('SELECT * FROM checklists WHERE user_id = ? ORDER BY order_index ASC, created_at DESC').all(userId);
    for (let c of checklists) {
        c.items = db.prepare(`
            SELECT ci.*, 
                   (SELECT MAX(dp.date) FROM daily_progress dp WHERE dp.checklist_item_id = ci.id AND dp.completed = 1) as last_completed_date,
                   (SELECT COUNT(*) FROM checklist_item_comments WHERE checklist_item_id = ci.id) as comments_count
            FROM checklist_items ci 
            WHERE ci.checklist_id = ? 
            ORDER BY order_index ASC
        `).all(c.id);
    }
    res.json(checklists);
});

// Reorder Checklists for a User (Inbox)
app.put('/api/users/:userId/checklists/reorder', (req, res) => {
    const { userId } = req.params;
    const { checklistIds } = req.body;

    if (!Array.isArray(checklistIds)) {
        return res.status(400).json({ error: 'checklistIds array is required' });
    }

    try {
        const updateOrder = db.prepare('UPDATE checklists SET order_index = ? WHERE id = ? AND user_id = ? AND project_id IS NULL');

        db.transaction(() => {
            checklistIds.forEach((id, index) => {
                updateOrder.run(index, id, userId);
            });
        })();

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Checklist reorder failed' });
    }
});

// GET Inbox (Checklists with no project)
app.get('/api/users/:userId/inbox', (req, res) => {
    const { userId } = req.params;
    try {
        let checklists = db.prepare('SELECT * FROM checklists WHERE user_id = ? AND project_id IS NULL ORDER BY order_index ASC, created_at DESC').all(userId);

        for (let c of checklists) {
            c.items = db.prepare(`
                SELECT ci.*, 
                       (SELECT MAX(dp.date) FROM daily_progress dp WHERE dp.checklist_item_id = ci.id AND dp.completed = 1) as last_completed_date,
                       (SELECT COUNT(*) FROM checklist_item_comments WHERE checklist_item_id = ci.id) as comments_count
                FROM checklist_items ci 
                WHERE ci.checklist_id = ? 
                ORDER BY order_index ASC
            `).all(c.id);
        }
        res.json(checklists);
    } catch (err) {
        console.error('Failed to fetch inbox', err);
        res.status(500).json({ error: 'Failed to fetch inbox' });
    }
});

app.post('/api/users/:userId/checklists', (req, res) => {
    const { userId } = req.params;
    const { title, items, project_id } = req.body;
    if (title === undefined) return res.status(400).json({ error: 'Title is required' });

    try {
        let newChecklistId;
        db.transaction(() => {
            const insertList = db.prepare('INSERT INTO checklists (user_id, title, project_id) VALUES (?, ?, ?)');
            const result = insertList.run(userId, title, project_id || null);
            newChecklistId = result.lastInsertRowid;

            if (items && Array.isArray(items)) {
                const insertItem = db.prepare('INSERT INTO checklist_items (checklist_id, content, order_index) VALUES (?, ?, ?)');
                items.forEach((itemContent, index) => {
                    insertItem.run(newChecklistId, itemContent, index);
                });
            }
        })();

        // Fetch and return the newly created checklist
        const c = db.prepare('SELECT * FROM checklists WHERE id = ?').get(newChecklistId);
        c.items = db.prepare(`
            SELECT ci.*, 
                   (SELECT MAX(dp.date) FROM daily_progress dp WHERE dp.checklist_item_id = ci.id AND dp.completed = 1) as last_completed_date,
                   (SELECT COUNT(*) FROM checklist_item_comments WHERE checklist_item_id = ci.id) as comments_count
            FROM checklist_items ci 
            WHERE ci.checklist_id = ? 
            ORDER BY order_index ASC
        `).all(newChecklistId);
        res.json(c);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create checklist' });
    }
});

// Copy template to user's checklists
app.post('/api/users/:userId/checklists/from-template', (req, res) => {
    const { userId } = req.params;
    const { templateId, active_days, project_id } = req.body;

    try {
        const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(templateId);
        if (!template) return res.status(404).json({ error: 'Template not found' });

        const items = db.prepare('SELECT content FROM template_items WHERE template_id = ?').all(templateId);

        let newChecklistId;
        db.transaction(() => {
            const insertList = db.prepare('INSERT INTO checklists (user_id, title, project_id) VALUES (?, ?, ?)');
            const result = insertList.run(userId, template.title, project_id || null);
            newChecklistId = result.lastInsertRowid;

            const insertItem = db.prepare('INSERT INTO checklist_items (checklist_id, content, order_index) VALUES (?, ?, ?)');
            items.forEach((item, index) => {
                insertItem.run(newChecklistId, item.content, index);
            });
        })();

        const c = db.prepare('SELECT * FROM checklists WHERE id = ?').get(newChecklistId);
        c.items = db.prepare(`
            SELECT ci.*, 
                   (SELECT MAX(dp.date) FROM daily_progress dp WHERE dp.checklist_item_id = ci.id AND dp.completed = 1) as last_completed_date
            FROM checklist_items ci 
            WHERE ci.checklist_id = ? 
            ORDER BY order_index ASC
        `).all(newChecklistId);
        res.json(c);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to instantiate template' });
    }
});

// Update Checklist
app.put('/api/checklists/:id', (req, res) => {
    const { id } = req.params;
    const { title } = req.body;
    try {
        if (title !== undefined) {
            db.prepare('UPDATE checklists SET title = ? WHERE id = ?').run(title, id);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Update failed' });
    }
});

app.delete('/api/checklists/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM checklists WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Delete failed' });
    }
});


// Add / Update / Delete single checklist item
app.post('/api/checklists/:checklistId/items', (req, res) => {
    const { checklistId } = req.params;
    let { content, order_index, parent_item_id, target_date, description, repeat_rule, time, duration, priority, reminder_minutes, prepend } = req.body;
    try {
        if (prepend) {
            // Shift all existing items in this checklist down by 1
            db.prepare('UPDATE checklist_items SET order_index = order_index + 1 WHERE checklist_id = ?').run(checklistId);
            order_index = 0;
        } else if (order_index === undefined || order_index === null) {
            const maxOrder = db.prepare('SELECT MAX(order_index) as maxIdx FROM checklist_items WHERE checklist_id = ?').get(checklistId);
            order_index = (maxOrder && maxOrder.maxIdx !== null) ? maxOrder.maxIdx + 1 : 0;
        }

        const result = db.prepare('INSERT INTO checklist_items (checklist_id, content, order_index, parent_item_id, target_date, description, repeat_rule, time, duration, priority, reminder_minutes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
            .run(checklistId, content, order_index, parent_item_id || null, target_date || null, description || null, repeat_rule || null, time || null, duration || 15, priority || 4, reminder_minutes !== undefined ? reminder_minutes : null);
        const item = db.prepare(`
            SELECT ci.*, 
                   (SELECT MAX(dp.date) FROM daily_progress dp WHERE dp.checklist_item_id = ci.id AND dp.completed = 1) as last_completed_date
            FROM checklist_items ci 
            WHERE ci.id = ?
        `).get(result.lastInsertRowid);
        res.json(item);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Add item failed' });
    }
});

// Reorder Checklist Items
app.put('/api/checklists/:checklistId/reorder', (req, res) => {
    const { checklistId } = req.params;
    const { itemIds } = req.body; // Array of item IDs in the new sorted order

    if (!Array.isArray(itemIds)) {
        return res.status(400).json({ error: 'itemIds array is required' });
    }

    try {
        const updateOrder = db.prepare('UPDATE checklist_items SET order_index = ? WHERE id = ? AND checklist_id = ?');

        db.transaction(() => {
            itemIds.forEach((id, index) => {
                updateOrder.run(index, id, checklistId);
            });
        })();

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Reorder failed' });
    }
});

app.delete('/api/items/:itemId', (req, res) => {
    try {
        db.prepare('DELETE FROM checklist_items WHERE id = ?').run(req.params.itemId);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Delete item failed' });
    }
});
app.put('/api/items/:itemId', (req, res) => {
    let { content, target_date, checklist_id, description, repeat_rule, time, duration, priority, reminder_minutes } = req.body;
    try {
        const updates = [];
        const params = [];

        if (content !== undefined) {
            updates.push('content = ?');
            params.push(content);
        }
        if (target_date !== undefined) {
            updates.push('target_date = ?');
            params.push(target_date);
        }
        if (checklist_id !== undefined) {
            // Check for special string IDs from ProjectSelectorDropdown
            let actualChecklistId = checklist_id;
            
            if (typeof checklist_id === 'string' && (checklist_id === 'INBOX' || String(checklist_id).startsWith('NEW_INBOX_'))) {
                // We need more info to resolve these
                const itemContext = db.prepare(`
                    SELECT ci.checklist_id, c.user_id, c.project_id 
                    FROM checklist_items ci 
                    JOIN checklists c ON ci.checklist_id = c.id 
                    WHERE ci.id = ?
                `).get(req.params.itemId);
                
                if (itemContext) {
                    if (checklist_id === 'INBOX') {
                        // Find user's primary inbox list (project_id IS NULL)
                        let inbox = db.prepare(`SELECT id FROM checklists WHERE user_id = ? AND project_id IS NULL AND (title = '' OR title = 'תיבת המשימות' OR title = 'Inbox') ORDER BY order_index ASC`).get(itemContext.user_id);
                        if (!inbox) {
                            // Create headless inbox
                            const result = db.prepare('INSERT INTO checklists (user_id, title) VALUES (?, ?)').run(itemContext.user_id, '');
                            actualChecklistId = result.lastInsertRowid;
                        } else {
                            actualChecklistId = inbox.id;
                        }
                    } else if (String(checklist_id).startsWith('NEW_INBOX_')) {
                        const targetProjectId = String(checklist_id).replace('NEW_INBOX_', '');
                        // Find project's header list
                        let projectInbox = db.prepare(`SELECT id FROM checklists WHERE project_id = ? AND (title = '' OR title = 'כללי' OR title = 'General') ORDER BY order_index ASC`).get(targetProjectId);
                        if (!projectInbox) {
                            // Create headless project inbox
                            const result = db.prepare('INSERT INTO checklists (user_id, title, project_id) VALUES (?, ?, ?)').run(itemContext.user_id, '', targetProjectId);
                            actualChecklistId = result.lastInsertRowid;
                        } else {
                            actualChecklistId = projectInbox.id;
                        }
                    }
                }
            }

            updates.push('checklist_id = ?');
            params.push(actualChecklistId);
        }
        if (description !== undefined) {
            updates.push('description = ?');
            params.push(description);
        }
        if (repeat_rule !== undefined) {
            updates.push('repeat_rule = ?');
            params.push(repeat_rule);
        }
        if (time !== undefined) {
            updates.push('time = ?');
            params.push(time);
        }
        if (duration !== undefined) {
            updates.push('duration = ?');
            params.push(duration);
        }
        if (priority !== undefined) {
            updates.push('priority = ?');
            params.push(priority);
        }
        if (reminder_minutes !== undefined) {
            updates.push('reminder_minutes = ?');
            params.push(reminder_minutes);
        }

        if (updates.length > 0) {
            params.push(req.params.itemId);
            db.prepare(`UPDATE checklist_items SET ${updates.join(', ')} WHERE id = ?`).run(...params);
        }
        res.json({ success: true });
    } catch (err) {
        console.error('Update item failed:', err);
        res.status(500).json({ error: 'Update item failed' });
    }
});

// Update multiple items date and time
app.put('/api/items/bulk/datetime', (req, res) => {
    const { itemIds, target_date, time } = req.body;
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
        return res.status(400).json({ error: 'itemIds array is required' });
    }
    try {
        const updates = [];
        const params = [];

        if (target_date !== undefined) {
            updates.push('target_date = ?');
            params.push(target_date);
        }
        if (time !== undefined) {
            updates.push('time = ?');
            params.push(time === '' ? null : time);
        }

        if (updates.length > 0) {
            const placeholders = itemIds.map(() => '?').join(', ');
            params.push(...itemIds);
            db.prepare(`UPDATE checklist_items SET ${updates.join(', ')} WHERE id IN (${placeholders})`).run(...params);
        }

        res.json({ success: true, count: itemIds.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to bulk update items datetime' });
    }
});

// Update item date and time explicitly for calendar drag and drop
app.put('/api/items/:itemId/datetime', (req, res) => {
    const { target_date, time } = req.body;
    try {
        const updates = [];
        const params = [];

        // If dragging to a new day, target_date will be provided. Note that FullCalendar may send null to clear it.
        if (target_date !== undefined) {
            updates.push('target_date = ?');
            params.push(target_date);
        }

        // If it's a timed event and dragged, time might be updated
        if (time !== undefined) {
            updates.push('time = ?');
            // A time of '' or null means clear the time
            params.push(time === '' ? null : time);
        }

        if (updates.length > 0) {
            params.push(req.params.itemId);
            db.prepare(`UPDATE checklist_items SET ${updates.join(', ')} WHERE id = ?`).run(...params);
        }

        // Fetch updated item to return
        const updatedItem = db.prepare(`
            SELECT *, (SELECT COUNT(*) FROM checklist_item_comments WHERE checklist_item_id = checklist_items.id) AS comments_count 
            FROM checklist_items 
            WHERE id = ?
        `).get(req.params.itemId);
        res.json({ success: true, item: updatedItem });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update item datetime' });
    }
});

// --- Daily Progress API ---
app.get('/api/users/:userId/progress/:date', (req, res) => {
    const { userId, date } = req.params; // date format: YYYY-MM-DD
    const progress = db.prepare('SELECT * FROM daily_progress WHERE user_id = ? AND date = ?').all(userId, date);
    res.json(progress);
});

// --- Global Calendar Tasks API ---
app.get('/api/users/:userId/tasks/by-month', (req, res) => {
    const { userId } = req.params;
    const { month } = req.query; // format: 'YYYY-MM'

    if (!month) {
        return res.status(400).json({ error: 'month query parameter is required (YYYY-MM)' });
    }

    try {
        const [yearStr, monthStr] = month.split('-');
        const year = parseInt(yearStr, 10);
        const monthNum = parseInt(monthStr, 10) - 1; // 0-indexed for JS Date

        // 1. Fetch all one-off items targeted for this month
        const targetedItemsQuery = db.prepare(`
            SELECT ci.*, 
                   (SELECT MAX(dp_last.date) FROM daily_progress dp_last WHERE dp_last.checklist_item_id = ci.id AND dp_last.completed = 1) as last_completed_date,
                   (SELECT COUNT(*) FROM checklist_item_comments WHERE checklist_item_id = ci.id) as comments_count,
                   c.title as checklistTitle, p.title as projectTitle
            FROM checklist_items ci
            JOIN checklists c ON ci.checklist_id = c.id
            LEFT JOIN projects p ON c.project_id = p.id
            WHERE c.user_id = ? 
              AND (ci.target_date LIKE ? OR (ci.target_date IS NULL AND ci.repeat_rule IS NOT NULL AND ci.repeat_rule != 'none'))
        `);
        const targetedItems = targetedItemsQuery.all(userId, `${month}-%`);

        // 2. Fetch all progress for this month to match with items
        // We join with checklist_items and projects to handle routine tasks too
        const progressQuery = db.prepare(`
            SELECT dp.checklist_item_id, dp.date, dp.completed, 
                   ci.content, ci.checklist_id, ci.priority, ci.time, ci.repeat_rule,
                   (SELECT MAX(dp_last.date) FROM daily_progress dp_last WHERE dp_last.checklist_item_id = ci.id AND dp_last.completed = 1) as last_completed_date,
                   (SELECT COUNT(*) FROM checklist_item_comments WHERE checklist_item_id = ci.id) as comments_count,
                   c.title as checklistTitle, p.id as project_id, p.title as projectTitle
            FROM daily_progress dp
            JOIN checklist_items ci ON dp.checklist_item_id = ci.id
            JOIN checklists c ON ci.checklist_id = c.id
            LEFT JOIN projects p ON c.project_id = p.id
            WHERE dp.user_id = ? AND dp.date LIKE ? AND dp.completed = 1
        `);
        const progressData = progressQuery.all(userId, `${month}-%`);
        // 3. Build summary map
        const summary = {};
        const daysInMonth = new Date(year, monthNum + 1, 0).getDate();

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(monthNum + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const tasksMap = new Map();

            // First: add one-off targeted items for this day OR relevant recurring items
            targetedItems.filter(i => {
                if (!i.repeat_rule || i.repeat_rule === 'none') {
                    return i.target_date && i.target_date.startsWith(dateStr);
                }
                // It's recurring. Check if this date matches the rule starting from target_date (if present)
                // Note: i.target_date is the "current" target date for a recurring task in our DB
                return isOccurrenceOnDate(dateStr, i.target_date, i.repeat_rule);
            }).forEach(i => {
                tasksMap.set(i.id, {
                    ...i,
                    completed: false // Default, will be updated by progress next
                });
            });

            // Second: add completed items for this day (overwrites with completion state, also adds routine items)
            progressData.filter(p => p.date === dateStr).forEach(p => {
                tasksMap.set(p.checklist_item_id, {
                    id: p.checklist_item_id,
                    content: p.content,
                    checklist_id: p.checklist_id,
                    priority: p.priority,
                    time: p.time,
                    checklistTitle: p.checklistTitle,
                    project_id: p.project_id,
                    projectTitle: p.projectTitle,
                    completed: true
                });
            });

            if (tasksMap.size > 0) {
                const tasks = Array.from(tasksMap.values());
                summary[dateStr] = {
                    total: tasks.length,
                    tasks: tasks
                };
            }
        }

        res.json(summary);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch monthly task summary' });
    }
});

app.get('/api/users/:userId/tasks/by-date', (req, res) => {
    const { userId } = req.params;
    const { date } = req.query; // format: 'YYYY-MM-DD'

    if (!date) {
        return res.status(400).json({ error: 'date query parameter is required (YYYY-MM-DD)' });
    }

    try {
        const dayOfWeekStr = new Date(date).getDay().toString(); // '0' to '6'
        const searchPattern = `%,${dayOfWeekStr},%`;

        // Fetch items matching exact target_date OR recurring rules
        const tasksQuery = db.prepare(`
            SELECT 
                ci.id, ci.checklist_id, ci.parent_item_id, ci.content, ci.order_index, ci.target_date, 
                ci.repeat_rule, ci.created_at, ci.time, ci.duration, ci.priority, ci.reminder_minutes,
                (SELECT MAX(dp_last.date) FROM daily_progress dp_last WHERE dp_last.checklist_item_id = ci.id AND dp_last.completed = 1) as last_completed_date,
                (SELECT COUNT(*) FROM checklist_item_comments WHERE checklist_item_id = ci.id) as comments_count,
                c.title as checklist_title, c.order_index as c_order,
                p.title as project_title, p.id as project_id
            FROM checklist_items ci
            JOIN checklists c ON ci.checklist_id = c.id
            LEFT JOIN projects p ON c.project_id = p.id
            WHERE 
                c.user_id = ? 
                AND (
                    (ci.target_date IS NOT NULL AND ci.target_date <= ?) 
                    OR (ci.target_date IS NULL AND ci.repeat_rule IS NOT NULL AND ci.repeat_rule != 'none')
                )
            ORDER BY COALESCE(c.project_id, 0) ASC, c.order_index ASC, ci.order_index ASC
        `);

        // We only need date once now for <=, and once for dayOfWeek
        const tasks = tasksQuery.all(userId, date);

        // Fetch completion status
        const progressQuery = db.prepare('SELECT checklist_item_id, completed FROM daily_progress WHERE user_id = ? AND date = ?');
        const progressData = progressQuery.all(userId, date);
        const progressMap = {};
        progressData.forEach(p => { progressMap[p.checklist_item_id] = p.completed === 1; });

        // Group by Project -> Checklist
        const groupedMap = new Map();

        tasks.forEach(task => {
            task.completed = !!progressMap[task.id];

            const projIdKey = task.project_id || 0; // 0 for no project

            if (!groupedMap.has(projIdKey)) {
                groupedMap.set(projIdKey, {
                    project_id: task.project_id,
                    project_title: task.project_title || 'תיבת המשימות',
                    checklistsMap: new Map()
                });
            }

            const pObj = groupedMap.get(projIdKey);

            if (!pObj.checklistsMap.has(task.checklist_id)) {
                pObj.checklistsMap.set(task.checklist_id, {
                    id: task.checklist_id,
                    title: task.checklist_title,
                    order_index: task.c_order,
                    itemsMap: new Map()
                });
            }

            const cObj = pObj.checklistsMap.get(task.checklist_id);
            cObj.itemsMap.set(task.id, {
                id: task.id,
                parent_item_id: task.parent_item_id,
                content: task.content,
                order_index: task.order_index,
                target_date: task.target_date,
                repeat_rule: task.repeat_rule,
                time: task.time,
                duration: task.duration,
                priority: task.priority,
                reminder_minutes: task.reminder_minutes,
                last_completed_date: task.last_completed_date,
                comments_count: task.comments_count,
                created_at: task.created_at,
                completed: task.completed,
                children: []
            });
        });

        // Convert Maps to nested arrays
        const result = Array.from(groupedMap.values()).map(proj => {
            const checklists = Array.from(proj.checklistsMap.values()).map(checklist => {
                const flatItems = Array.from(checklist.itemsMap.values());
                const hierarchical = [];
                const itemLookup = {};
                flatItems.forEach(i => itemLookup[i.id] = i);

                flatItems.forEach(i => {
                    if (i.parent_item_id && itemLookup[i.parent_item_id]) {
                        itemLookup[i.parent_item_id].children.push(i);
                    } else {
                        hierarchical.push(i);
                    }
                });

                return {
                    id: checklist.id,
                    title: checklist.title,
                    items: hierarchical
                };
            });
            return {
                id: proj.project_id,
                title: proj.project_title,
                checklists: checklists
            };
        });

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch global tasks by date' });
    }
});

app.get('/api/users/:userId/sidebar-counts', (req, res) => {
    const { userId } = req.params;
    const { date } = req.query; // format 'YYYY-MM-DD'

    if (!date) return res.status(400).json({ error: 'date is required' });

    try {
        const dayOfWeekStr = new Date(date).getDay().toString();
        const searchPattern = `%,${dayOfWeekStr},%`;

        const todayTasksQuery = db.prepare(`
            SELECT ci.id 
            FROM checklist_items ci
            JOIN checklists c ON ci.checklist_id = c.id
            WHERE c.user_id = ? 
            AND ci.parent_item_id IS NULL
            AND (
                (ci.target_date IS NOT NULL AND ci.target_date = ?)
                OR (ci.target_date IS NULL AND ci.repeat_rule IS NOT NULL AND ci.repeat_rule != 'none')
            )
        `);
        const todayTasks = todayTasksQuery.all(userId, date);

        const inboxTasksQuery = db.prepare(`
            SELECT ci.id 
            FROM checklist_items ci
            JOIN checklists c ON ci.checklist_id = c.id
            WHERE c.user_id = ? AND c.project_id IS NULL AND ci.parent_item_id IS NULL
        `);
        const inboxTasks = inboxTasksQuery.all(userId);

        const progressQuery = db.prepare('SELECT checklist_item_id FROM daily_progress WHERE user_id = ? AND date = ? AND completed = 1');
        const completedIds = progressQuery.all(userId, date).map(p => p.checklist_item_id);

        const todayCount = todayTasks.filter(t => !completedIds.includes(t.id)).length;
        const inboxCount = inboxTasks.filter(t => !completedIds.includes(t.id)).length;

        res.json({ todayCount, inboxCount });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch sidebar counts' });
    }
});

app.get('/api/users/:userId/activity', (req, res) => {
    const { userId } = req.params;
    try {
        const activity = db.prepare(`
            SELECT 
                dp.id, dp.date, ci.content as message, p.title as project_name, c.project_id
            FROM daily_progress dp
            JOIN checklist_items ci ON dp.checklist_item_id = ci.id
            JOIN checklists c ON ci.checklist_id = c.id
            LEFT JOIN projects p ON c.project_id = p.id
            WHERE dp.user_id = ? AND dp.completed = 1
            ORDER BY dp.date DESC, dp.id DESC
            LIMIT 50
        `).all(userId);

        // Enhance message to be more user-friendly as requested
        const enhancedActivity = activity.map(item => ({
            ...item,
            message: `השלמת משימה: ${item.message}`,
            project_name: item.project_name || 'תיבת דואר'
        }));

        res.json(enhancedActivity);
    } catch (err) {
        console.error('Failed to fetch activity:', err);
        res.status(500).json({ error: 'Failed to fetch activity' });
    }
});

// --- Comments API ---

// Project Comments
app.get('/api/projects/:projectId/comments', (req, res) => {
    try {
        const comments = db.prepare(`
            SELECT pc.*, u.username, u.profile_image
            FROM project_comments pc
            JOIN users u ON pc.user_id = u.id
            WHERE pc.project_id = ?
            ORDER BY pc.created_at ASC
        `).all(req.params.projectId);
        res.json(comments);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch project comments' });
    }
});

app.post('/api/projects/:projectId/comments', (req, res) => {
    const { user_id, content } = req.body;
    try {
        const result = db.prepare('INSERT INTO project_comments (project_id, user_id, content) VALUES (?, ?, ?)').run(req.params.projectId, user_id, content);
        const newComment = db.prepare(`
            SELECT pc.*, u.username, u.profile_image
            FROM project_comments pc
            JOIN users u ON pc.user_id = u.id
            WHERE pc.id = ?
        `).get(result.lastInsertRowid);
        
        res.json(newComment);

        // Broadcast to all users in the project room
        io.to(`project_${req.params.projectId}`).emit('new_comment', {
            projectId: req.params.projectId,
            comment: newComment
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to post project comment' });
    }
});

// Task (Checklist Item) Comments
app.get('/api/checklist-items/:id/comments', (req, res) => {
    try {
        const comments = db.prepare(`
            SELECT cic.*, u.username, u.profile_image
            FROM checklist_item_comments cic
            JOIN users u ON cic.user_id = u.id
            WHERE cic.checklist_item_id = ?
            ORDER BY cic.created_at ASC
        `).all(req.params.id);
        res.json(comments);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch task comments' });
    }
});

app.post('/api/checklist-items/:id/comments', (req, res) => {
    const { user_id, content } = req.body;
    try {
        const result = db.prepare('INSERT INTO checklist_item_comments (checklist_item_id, user_id, content) VALUES (?, ?, ?)').run(req.params.id, user_id, content);
        const newComment = db.prepare(`
            SELECT cic.*, u.username, u.profile_image
            FROM checklist_item_comments cic
            JOIN users u ON cic.user_id = u.id
            WHERE cic.id = ?
        `).get(result.lastInsertRowid);
        res.json(newComment);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to post task comment' });
    }
});

app.put('/api/checklist-item-comments/:id', (req, res) => {
    const { content } = req.body;
    try {
        db.prepare('UPDATE checklist_item_comments SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(content, req.params.id);
        const updatedComment = db.prepare(`
            SELECT cic.*, u.username, u.profile_image
            FROM checklist_item_comments cic
            JOIN users u ON cic.user_id = u.id
            WHERE cic.id = ?
        `).get(req.params.id);
        res.json(updatedComment);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update task comment' });
    }
});

app.delete('/api/checklist-item-comments/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM checklist_item_comments WHERE id = ?').run(req.params.id);
        res.json({ message: 'Comment deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete task comment' });
    }
});

app.get('/api/users/:userId/progress', (req, res) => {
    const { userId } = req.params;
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Date is required' });
    try {
        const progress = db.prepare('SELECT * FROM daily_progress WHERE user_id = ? AND date = ?').all(userId, date);
        res.json(progress);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch progress' });
    }
});

app.post('/api/users/:userId/progress', (req, res) => {
    const { userId } = req.params;
    const { checklist_item_id, date, completed } = req.body;

    try {
        db.transaction(() => {
            const upsert = db.prepare(`
                INSERT INTO daily_progress (user_id, checklist_item_id, date, completed)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(user_id, checklist_item_id, date) DO UPDATE SET completed = excluded.completed
            `);
            upsert.run(userId, checklist_item_id, date, completed ? 1 : 0);

            // Handle Recurrence
            if (completed) {
                const item = db.prepare('SELECT id, target_date, repeat_rule FROM checklist_items WHERE id = ?').get(checklist_item_id);
                if (item && item.repeat_rule && item.repeat_rule !== 'none') {
                    // Advance from the CURRENT target_date of the task
                    // This ensures we move to the NEXT logical occurrence even if marking a past one
                    const baseDate = item.target_date || date;
                    const nextDate = calculateNextOccurrence(baseDate, item.repeat_rule);
                    if (nextDate) {
                        db.prepare('UPDATE checklist_items SET target_date = ? WHERE id = ?').run(nextDate, checklist_item_id);
                    }
                }
            }
        })();

        // Find out the project this task belongs to and broadcast it
        const info = db.prepare('SELECT c.project_id FROM checklist_items ci JOIN checklists c ON ci.checklist_id = c.id WHERE ci.id = ?').get(checklist_item_id);
        if (info && info.project_id) {
            const userRow = db.prepare('SELECT username, profile_image FROM users WHERE id = ?').get(userId);
            io.to(`project_${info.project_id}`).emit('task_completed', {
                checklist_item_id,
                completed: completed ? 1 : 0,
                userId: parseInt(userId),
                username: userRow ? userRow.username : 'Unknown',
                profile_image: userRow ? userRow.profile_image : null
            });
            
            // If it was moved, we might need a separate event, but for now 
            // the client usually refreshes or handles the move when the task is marked done.
        }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update progress' });
    }
});

// --- Project Members & Shared Progress API ---
app.get('/api/projects/:projectId/members', (req, res) => {
    try {
        const members = db.prepare(`
            SELECT pm.role, u.id, u.username, u.profile_image
            FROM project_members pm
            JOIN users u ON pm.user_id = u.id
            WHERE pm.project_id = ?
            ORDER BY pm.role DESC
        `).all(req.params.projectId);
        res.json(members);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch project members' });
    }
});

app.post('/api/projects/:projectId/members', (req, res) => {
    const { user_id, role } = req.body;
    try {
        db.prepare(`
            INSERT OR IGNORE INTO project_members (project_id, user_id, role)
            VALUES (?, ?, ?)
        `).run(req.params.projectId, user_id, role || 'member');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to add project member' });
    }
});

app.delete('/api/projects/:projectId/members/:userId', (req, res) => {
    try {
        db.prepare('DELETE FROM project_members WHERE project_id = ? AND user_id = ?').run(req.params.projectId, req.params.userId);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to remove project member' });
    }
});

app.put('/api/projects/:projectId/members/:userId', (req, res) => {
    const { role } = req.body;
    try {
        db.prepare('UPDATE project_members SET role = ? WHERE project_id = ? AND user_id = ?').run(role, req.params.projectId, req.params.userId);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update member role' });
    }
});

// Get team progress for a project on a specific date
app.get('/api/projects/:projectId/progress/:date', (req, res) => {
    try {
        const items = db.prepare(`
            SELECT dp.checklist_item_id, dp.completed, u.id as user_id, u.username, u.profile_image
            FROM daily_progress dp
            JOIN users u ON dp.user_id = u.id
            JOIN checklist_items ci ON dp.checklist_item_id = ci.id
            JOIN checklists c ON ci.checklist_id = c.id
            WHERE c.project_id = ? AND dp.date = ? AND dp.completed = 1
        `).all(req.params.projectId, req.params.date);
        res.json(items);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch team progress' });
    }
});

// --- Admin Stats API ---
app.get('/api/admin/stats', adminAuth, (req, res) => {
    try {
        const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
        const totalChecklists = db.prepare('SELECT COUNT(*) as count FROM checklists').get().count;
        const totalProgress = db.prepare('SELECT COUNT(*) as count FROM daily_progress WHERE completed = 1').get().count;
        const activeUsersToday = db.prepare("SELECT count(distinct user_id) as count FROM daily_progress WHERE date = date('now', 'localtime')").get().count;

        // Most popular templates or active lists info can be added here
        res.json({
            totalUsers,
            totalChecklists,
            totalCompletedTasks: totalProgress,
            activeUsersToday
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// --- Admin Users & Checklists ---
app.get('/api/admin/users', adminAuth, (req, res) => {
    try {
        const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

app.get('/api/admin/users/:id', adminAuth, (req, res) => {
    try {
        const user = db.prepare('SELECT id, username, email, phone, profile_image, created_at, is_active FROM users WHERE id = ?').get(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const projectsCount = db.prepare('SELECT COUNT(*) as count FROM projects WHERE user_id = ?').get(req.params.id).count;
        const checklistsCount = db.prepare('SELECT COUNT(*) as count FROM checklists WHERE user_id = ?').get(req.params.id).count;
        const totalCompleted = db.prepare('SELECT COUNT(*) as count FROM daily_progress WHERE user_id = ? AND completed = 1').get(req.params.id).count;

        res.json({ ...user, projectsCount, checklistsCount, totalCompleted });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch user details' });
    }
});

app.get('/api/admin/users/:id/logs', adminAuth, (req, res) => {
    try {
        const logs = db.prepare('SELECT * FROM user_logs WHERE user_id = ? ORDER BY created_at DESC').all(req.params.id);
        res.json(logs);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch user logs' });
    }
});

app.get('/api/admin/users/:id/login-logs', adminAuth, (req, res) => {
    try {
        const logs = db.prepare('SELECT * FROM login_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(req.params.id);
        res.json(logs);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch login logs' });
    }
});

// --- WhatsApp Admin Features ---
app.get('/api/admin/whatsapp/analytics', adminAuth, (req, res) => {
    try {
        const totalRemindersSent = db.prepare("SELECT COUNT(*) as count FROM whatsapp_logs WHERE status = 'SENT'").get().count;
        const totalRemindersFailed = db.prepare("SELECT COUNT(*) as count FROM whatsapp_logs WHERE status = 'FAILED'").get().count;
        const enabledUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE whatsapp_enabled = 1 AND phone IS NOT NULL").get().count;
        
        // Count tasks added by whatsapp (proxy by measuring items dynamically inserted within last X days, not directly tracked easily so we skip for now)
        // Future tracking can log 'WHATSAPP_TASK_ADDED' into user_logs.
        
        res.json({ totalRemindersSent, totalRemindersFailed, enabledUsers });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch WhatsApp analytics' });
    }
});

app.post('/api/admin/whatsapp/broadcast', adminAuth, (req, res) => {
    const { message } = req.body;
    if (!message || message.trim() === '') return res.status(400).json({ error: 'Message cannot be empty' });

    try {
        const users = db.prepare('SELECT phone FROM users WHERE whatsapp_enabled = 1 AND phone IS NOT NULL AND phone != ""').all();
        const insertOutbox = db.prepare('INSERT INTO whatsapp_outbox (to_phone, message) VALUES (?, ?)');
        
        let count = 0;
        db.transaction(() => {
            for (const user of users) {
                insertOutbox.run(user.phone, message);
                count++;
            }
        })();
        
        res.json({ success: true, count });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to queue broadcast' });
    }
});

app.post('/api/admin/users/:id/reset-password', adminAuth, (req, res) => {
    try {
        const userId = req.params.id;
        const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Generate an 8-character random alphanumeric password
        const newPassword = crypto.randomBytes(4).toString('hex');
        const hash = hashPassword(newPassword);

        db.transaction(() => {
            db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, userId);
            db.prepare('INSERT INTO user_logs (user_id, admin_id, action, details) VALUES (?, ?, ?, ?)')
                .run(userId, req.admin.id, 'PASSWORD_RESET', `Password reset by admin to: ${newPassword}`);
        })();

        res.json({ success: true, newPassword });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

app.put('/api/admin/users/:id/status', adminAuth, (req, res) => {
    try {
        const userId = req.params.id;
        const { is_active } = req.body;

        if (typeof is_active !== 'boolean') {
            return res.status(400).json({ error: 'is_active must be a boolean' });
        }

        const user = db.prepare('SELECT id, is_active FROM users WHERE id = ?').get(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        db.transaction(() => {
            db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(is_active ? 1 : 0, userId);
            const actionString = is_active ? 'ACCOUNT_ACTIVATED' : 'ACCOUNT_SUSPENDED';
            const detailsString = is_active ? 'Account activated by admin' : 'Account suspended by admin';
            db.prepare('INSERT INTO user_logs (user_id, admin_id, action, details) VALUES (?, ?, ?, ?)')
                .run(userId, req.admin.id, actionString, detailsString);
        })();

        res.json({ success: true, is_active });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update user status' });
    }
});

// --- Push Notification API ---
app.get('/api/notifications/public-key', (req, res) => {
    res.json({ publicKey: publicVapidKey });
});

app.post('/api/notifications/subscribe', (req, res) => {
    const { user_id, subscription } = req.body;
    if (!user_id || !subscription) return res.status(400).json({ error: 'חסרים פרטים' });

    try {
        const existing = db.prepare('SELECT id FROM web_push_subscriptions WHERE user_id = ? AND endpoint = ?').get(user_id, subscription.endpoint);
        if (!existing) {
            db.prepare('INSERT INTO web_push_subscriptions (user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?)').run(
                user_id, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth
            );
        }
        res.status(201).json({});
    } catch (e) {
        console.error('Error saving subscription', e);
        res.status(500).json({ error: 'שגיאת שרת' });
    }
});

app.post('/api/notifications/unsubscribe', (req, res) => {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: 'חסרים פרטים' });

    try {
        db.prepare('DELETE FROM web_push_subscriptions WHERE endpoint = ?').run(endpoint);
        res.json({ success: true });
    } catch (e) {
        console.error('Error removing subscription', e);
        res.status(500).json({ error: 'שגיאת שרת' });
    }
});

// --- Cron Job for Reminders ---
cron.schedule('* * * * *', async () => {
    try {
        const now = new Date();
        const currentDate = now.toISOString().split('T')[0];

        // Items that have a reminder
        const itemsWithReminders = db.prepare(`
            SELECT ci.id, ci.content, ci.target_date, ci.time, ci.reminder_minutes, 
                   c.user_id 
            FROM checklist_items ci
            JOIN checklists c ON ci.checklist_id = c.id
            JOIN users u ON c.user_id = u.id
            WHERE ci.reminder_minutes IS NOT NULL AND ci.target_date IS NOT NULL AND ci.time IS NOT NULL AND ci.target_date >= ?
        `).all(currentDate);

        for (const item of itemsWithReminders) {
            // Check if reminder is due
            const taskDateTime = new Date(`${item.target_date}T${item.time}:00`);
            const reminderTime = new Date(taskDateTime.getTime() - item.reminder_minutes * 60000);

            if (now.getHours() === reminderTime.getHours() && 
                now.getMinutes() === reminderTime.getMinutes() && 
                now.getDate() === reminderTime.getDate() && 
                now.getMonth() === reminderTime.getMonth() && 
                now.getFullYear() === reminderTime.getFullYear()) {
                
                // Send push notification to user
                const subscriptions = db.prepare('SELECT endpoint, p256dh, auth FROM web_push_subscriptions WHERE user_id = ?').all(item.user_id);

                const payload = JSON.stringify({
                    title: 'תזכורת למשימה: ' + item.content,
                    body: `משימה זו מתוכננת לשעה ${item.time}`,
                    data: { url: '/' }
                });

                for (const sub of subscriptions) {
                    const pushSubscription = {
                        endpoint: sub.endpoint,
                        keys: { p256dh: sub.p256dh, auth: sub.auth }
                    };
                    try {
                        await webpush.sendNotification(pushSubscription, payload);
                    } catch (error) {
                        console.error('Error sending push notification', error);
                        if (error.statusCode === 410) {
                            db.prepare('DELETE FROM web_push_subscriptions WHERE endpoint = ?').run(sub.endpoint);
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.error('Cron job error', e);
    }
});

// Serve static frontend files in production
const frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendDistPath));

// Catch-all route for client-side routing (React Router)
app.use((req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
});


const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
