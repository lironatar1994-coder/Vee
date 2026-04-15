const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/users/search
router.get('/users/search', (req, res) => {
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

// GET /api/users/:userId/friends
router.get('/users/:userId/friends', (req, res) => {
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

// POST /api/friends/request
router.post('/friends/request', (req, res) => {
    const { requester_id, receiver_id } = req.body;
    try {
        const existing = db.prepare('SELECT id FROM friends WHERE (requester_id = ? AND receiver_id = ?) OR (requester_id = ? AND receiver_id = ?)').get(requester_id, receiver_id, receiver_id, requester_id);
        if (existing) return res.status(400).json({ error: 'Request already exists' });

        const result = db.prepare('INSERT INTO friends (requester_id, receiver_id) VALUES (?, ?)').run(requester_id, receiver_id);
        res.json({ id: result.lastInsertRowid, status: 'pending' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to send friend request' });
    }
});

// PUT /api/friends/accept/:requestId
router.put('/friends/accept/:requestId', (req, res) => {
    try {
        db.prepare("UPDATE friends SET status = 'accepted' WHERE id = ?").run(req.params.requestId);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to accept friend request' });
    }
});

// DELETE /api/friends/:requestId
router.delete('/friends/:requestId', (req, res) => {
    try {
        db.prepare("DELETE FROM friends WHERE id = ?").run(req.params.requestId);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to remove friend or request' });
    }
});

module.exports = router;
