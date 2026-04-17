const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../database');
const { hashPassword, verifyPassword, generateToken, generateAdminToken } = require('../utils/authUtils');

// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { identifier, password, display_name, invite_token } = req.body;
    if (!identifier || !password) return res.status(400).json({ error: 'חסרים פרטים' });
    
    const isEmail = /^[^@]+@[^@]+\.[^@]+$/.test(identifier);
    const isPhone = /^[0-9+\-() ]{7,15}$/.test(identifier.replace(/\s/g, ''));
    const username = display_name || identifier.split('@')[0].replace(/[^a-zA-Z0-9א-ת]/g, '');
    const email = isEmail ? identifier : null;
    const phone = isPhone && !isEmail ? identifier : null;
    
    try {
        const hash = await hashPassword(password);

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
        
        const token = generateToken({ id: user.id });
        res.json({ success: true, user, token });
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(409).json({ error: 'המשתמש כבר קיים. נסה להתחבר.' });
        }
        console.error('Registration error:', err);
        res.status(500).json({ error: 'שגיאת שרת', details: err.message });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { identifier, password } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

    if (!identifier || !password) return res.status(400).json({ error: 'חסרים פרטים' });

    try {
        // 1. Find user by any identifier
        const user = db.prepare(
            'SELECT id, username, email, phone, password_hash, profile_image, invited_by, whatsapp_enabled, is_onboarded FROM users WHERE email = ? OR phone = ? OR username = ?'
        ).get(identifier, identifier, identifier);

        if (!user) {
            return res.status(401).json({ error: 'פרטי התחברות שגויים' });
        }

        // 2. Verify password (handles legacy SHA256 migration internally)
        const isValid = await verifyPassword(password, user.password_hash);
        if (!isValid) {
            db.prepare('INSERT INTO login_logs (user_id, identifier_attempted, status, ip_address) VALUES (?, ?, ?, ?)').run(
                user.id, identifier, 'failed', ip
            );
            return res.status(401).json({ error: 'פרטי התחברות שגויים' });
        }

        // 3. Migration Trigger: If the stored hash was legacy (SHA256), upgrade it to BCrypt on the fly
        if (!user.password_hash.startsWith('$2')) {
            const newHash = await hashPassword(password);
            db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, user.id);
            console.log(`[Security] Upgraded user ${user.id} to BCrypt hashing`);
        }

        // 4. Finalize login
        db.prepare('INSERT INTO login_logs (user_id, identifier_attempted, status, ip_address) VALUES (?, ?, ?, ?)').run(user.id, identifier, 'success', ip);
        db.prepare('UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

        try {
            user.invited_users = db.prepare('SELECT id, username, profile_image, created_at FROM users WHERE invited_by = ? ORDER BY created_at DESC').all(user.id);
        } catch (e) {
            user.invited_users = [];
        }

        // Don't send the hash back to the client
        delete user.password_hash;
        
        const token = generateToken({ id: user.id });
        res.json({ success: true, user, token });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'שגיאת שרת' });
    }
});

// Admin Login
router.post('/admin/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'חסרים פרטים' });

    try {
        const admin = db.prepare('SELECT id, email, password_hash FROM admins WHERE email = ?').get(email);
        if (!admin) return res.status(401).json({ error: 'פרטי התחברות שגויים' });

        const isValid = await verifyPassword(password, admin.password_hash);
        if (!isValid) return res.status(401).json({ error: 'פרטי התחברות שגויים' });

        // Upgrade admin hash if legacy
        if (!admin.password_hash.startsWith('$2')) {
            const newHash = await hashPassword(password);
            db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(newHash, admin.id);
        }

        const token = generateAdminToken({ id: admin.id });
        db.prepare('UPDATE admins SET token = ? WHERE id = ?').run(token, admin.id);

        res.json({ success: true, token, admin: { id: admin.id, email: admin.email } });
    } catch (err) {
        console.error('Admin login error:', err);
        res.status(500).json({ error: 'שגיאת שרת' });
    }
});

module.exports = router;
