const express = require('express');
const router = express.Router();
const db = require('../database');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const adminAuth = require('../middleware/adminAuth');
const { hashPassword } = require('../utils/authUtils');

// All routes in this router require admin authentication
router.use(adminAuth);

// GET /api/admin/stats
router.get('/stats', (req, res) => {
    try {
        const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
        const totalChecklists = db.prepare('SELECT COUNT(*) as count FROM checklists').get().count;
        const totalProgress = db.prepare('SELECT COUNT(*) as count FROM daily_progress WHERE completed = 1').get().count;
        const activeUsersToday = db.prepare("SELECT count(distinct user_id) as count FROM daily_progress WHERE date = date('now', 'localtime')").get().count;

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

// GET /api/admin/users
router.get('/users', (req, res) => {
    try {
        const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// GET /api/admin/users/:id
router.get('/users/:id', (req, res) => {
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

// GET /api/admin/users/:id/logs
router.get('/users/:id/logs', (req, res) => {
    try {
        const logs = db.prepare('SELECT * FROM user_logs WHERE user_id = ? ORDER BY created_at DESC').all(req.params.id);
        res.json(logs);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch user logs' });
    }
});

// GET /api/admin/users/:id/login-logs
router.get('/users/:id/login-logs', (req, res) => {
    try {
        const logs = db.prepare('SELECT * FROM login_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(req.params.id);
        res.json(logs);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch login logs' });
    }
});

// GET /api/admin/whatsapp/analytics
router.get('/whatsapp/analytics', (req, res) => {
    try {
        const totalRemindersSent = db.prepare("SELECT COUNT(*) as count FROM whatsapp_logs WHERE status = 'SENT'").get().count;
        const totalRemindersFailed = db.prepare("SELECT COUNT(*) as count FROM whatsapp_logs WHERE status = 'FAILED'").get().count;
        const enabledUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE whatsapp_enabled = 1 AND phone IS NOT NULL").get().count;
        
        res.json({ totalRemindersSent, totalRemindersFailed, enabledUsers });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch WhatsApp analytics' });
    }
});

// POST /api/admin/whatsapp/broadcast
router.post('/whatsapp/broadcast', (req, res) => {
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

// POST /api/admin/users/:id/reset-password
router.post('/users/:id/reset-password', async (req, res) => {
    try {
        const userId = req.params.id;
        const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const newPassword = crypto.randomBytes(4).toString('hex');
        const hash = await hashPassword(newPassword);

        db.transaction(() => {
            db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, userId);
            db.prepare('INSERT INTO user_logs (user_id, admin_id, action, details) VALUES (?, ?, ?, ?)')
                .run(userId, req.admin.id, 'PASSWORD_RESET', `Password reset by admin to: ${newPassword}`);
        })();

        res.json({ success: true, newPassword });
    } catch (err) {
        console.error('Admin password reset error:', err);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

// PUT /api/admin/users/:id/status
router.put('/users/:id/status', (req, res) => {
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

// GET /api/admin/whatsapp/status
router.get('/whatsapp/status', (req, res) => {
    try {
        const STATUS_FILE = path.join(__dirname, '..', 'whatsapp_status.json');
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

// GET /api/admin/whatsapp/logs
router.get('/whatsapp/logs', (req, res) => {
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

// GET /api/admin/settings/:key
router.get('/settings/:key', (req, res) => {
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

// POST /api/admin/settings
router.post('/settings', (req, res) => {
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

// GET /api/admin/logs/errors
router.get('/logs/errors', (req, res) => {
    try {
        const logPath = path.join(__dirname, '..', 'logs', 'error.log');
        if (!fs.existsSync(logPath)) return res.json([]);

        const logs = fs.readFileSync(logPath, 'utf8')
            .trim()
            .split('\n')
            .map(line => {
                try { return JSON.parse(line); } 
                catch (e) { return { message: line, level: 'error', timestamp: new Date() }; }
            })
            .reverse()
            .slice(0, 100);
        
        res.json(logs);
    } catch (err) {
        console.error('Error reading error logs:', err);
        res.status(500).json({ error: 'Failed to read error logs' });
    }
});

// GET /api/admin/logs/combined
router.get('/logs/combined', (req, res) => {
    try {
        const logPath = path.join(__dirname, '..', 'logs', 'combined.log');
        if (!fs.existsSync(logPath)) return res.json([]);

        const logs = fs.readFileSync(logPath, 'utf8')
            .trim()
            .split('\n')
            .map(line => {
                try { return JSON.parse(line); } 
                catch (e) { return { message: line, level: 'info', timestamp: new Date() }; }
            })
            .reverse()
            .slice(0, 100);
        
        res.json(logs);
    } catch (err) {
        console.error('Error reading combined logs:', err);
        res.status(500).json({ error: 'Failed to read combined logs' });
    }
});

module.exports = router;
