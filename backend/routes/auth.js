const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../database');
const { hashPassword } = require('../utils/authUtils');

// POST /api/auth/register
router.post('/register', (req, res) => {
    const { identifier, password, display_name, invite_token } = req.body;
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

        const user = db.prepare('SELECT id, username, email, phone, profile_image, is_onboarded FROM users WHERE id = ?').get(newUserId);
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
router.post('/login', (req, res) => {
    const { identifier, password, invite_token } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

    if (!identifier || !password) return res.status(400).json({ error: 'חסרים פרטים' });
    const hash = hashPassword(password);

    const potentialUser = db.prepare('SELECT id FROM users WHERE email = ? OR phone = ? OR username = ?').get(identifier, identifier, identifier);

    const user = db.prepare(
        `SELECT id, username, email, phone, profile_image, invited_by, whatsapp_enabled, is_onboarded FROM users
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
        } catch (e) { console.error('Failed to log failed login', e); }
        return res.status(401).json({ error: 'פרטי התחברות שגויים' });
    }

    try {
        db.prepare('INSERT INTO login_logs (user_id, status, ip_address) VALUES (?, ?, ?)').run(user.id, 'success', ip);
        db.prepare('UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
    } catch (e) { console.error('Failed to log success login', e); }

    try {
        user.invited_users = db.prepare('SELECT id, username, profile_image, created_at FROM users WHERE invited_by = ? ORDER BY created_at DESC').all(user.id);
    } catch (e) {
        user.invited_users = [];
    }

    res.json({ success: true, user });
});

// Admin Login
router.post('/admin/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'חסרים פרטים' });
    const hash = hashPassword(password);

    try {
        const admin = db.prepare('SELECT id, email FROM admins WHERE email = ? AND password_hash = ?').get(email, hash);
        if (!admin) return res.status(401).json({ error: 'פרטי התחברות שגויים' });

        const token = crypto.randomBytes(32).toString('hex');
        db.prepare('UPDATE admins SET token = ? WHERE id = ?').run(token, admin.id);

        res.json({ success: true, token, admin: { id: admin.id, email: admin.email } });
    } catch (err) {
        console.error('Admin login error:', err);
        res.status(500).json({ error: 'שגיאת שרת' });
    }
});

module.exports = router;
