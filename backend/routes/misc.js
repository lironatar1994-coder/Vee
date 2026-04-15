const express = require('express');
const router = express.Router();
const db = require('../database');
const upload = require('../middleware/upload');

// POST /api/upload
router.post('/upload', (req, res) => {
    upload.single('image')(req, res, function (err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'לא נבחרה תמונה' });
        }
        const imageUrl = `/uploads/${req.file.filename}`;
        res.json({ url: imageUrl });
    });
});

// GET /api/templates
router.get('/templates', (req, res) => {
    try {
        const templates = db.prepare('SELECT * FROM templates').all();
        for (let t of templates) {
            t.items = db.prepare('SELECT * FROM template_items WHERE template_id = ?').all(t.id);
        }
        res.json(templates);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
});

// GET /api/notifications/public-key
router.get('/notifications/public-key', (req, res) => {
    const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
    res.json({ publicKey: publicVapidKey });
});

// POST /api/notifications/subscribe
router.post('/notifications/subscribe', (req, res) => {
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

// POST /api/notifications/unsubscribe
router.post('/notifications/unsubscribe', (req, res) => {
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

// GET /api/settings/:key
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

module.exports = router;
