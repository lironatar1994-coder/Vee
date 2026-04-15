const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/users/:userId/projects
router.get('/users/:userId/projects', (req, res) => {
    const { userId } = req.params;
    try {
        const projects = db.prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY order_index ASC, created_at ASC').all(userId);
        res.json(projects);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

// POST /api/users/:userId/projects
router.post('/users/:userId/projects', (req, res) => {
    const { userId } = req.params;
    const { title, color, parent_id, description } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    try {
        const projectColor = color || '#6366f1';
        const parentId = parent_id || null;
        const maxOrder = db.prepare('SELECT MAX(order_index) as maxOrder FROM projects WHERE user_id = ?').get(userId);
        const nextOrder = (maxOrder.maxOrder || 0) + 1;
        const result = db.prepare('INSERT INTO projects (user_id, title, color, parent_id, order_index, description) VALUES (?, ?, ?, ?, ?, ?)').run(userId, title, projectColor, parentId, nextOrder, description || null);
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
        res.json(project);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create project' });
    }
});

// GET /api/projects/:id
router.get('/:id', (req, res) => {
    const { id } = req.params;
    try {
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
        if (!project) return res.status(404).json({ error: 'Project not found' });
        const checklists = db.prepare('SELECT * FROM checklists WHERE project_id = ? ORDER BY order_index ASC, created_at DESC').all(id);
        for (let c of checklists) {
            c.items = db.prepare('SELECT *, (SELECT COUNT(*) FROM checklist_item_comments WHERE checklist_item_id = checklist_items.id) AS comments_count FROM checklist_items WHERE checklist_id = ? ORDER BY order_index ASC').all(c.id);
        }
        const comments = db.prepare(`SELECT pc.*, u.username, u.profile_image FROM project_comments pc JOIN users u ON pc.user_id = u.id WHERE pc.project_id = ? ORDER BY pc.created_at ASC`).all(id);
        res.json({ project, checklists, comments });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch project' });
    }
});

// PUT /api/projects/:id
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { title, color, parent_id, description } = req.body;
    try {
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
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

// DELETE /api/projects/:id
router.delete('/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

// --- Members ---
router.get('/:projectId/members', (req, res) => {
    try {
        const members = db.prepare(`SELECT pm.role, u.id, u.username, u.profile_image FROM project_members pm JOIN users u ON pm.user_id = u.id WHERE pm.project_id = ? ORDER BY pm.role DESC`).all(req.params.projectId);
        res.json(members);
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

router.post('/:projectId/members', (req, res) => {
    const { user_id, role } = req.body;
    try {
        db.prepare(`INSERT OR IGNORE INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)`).run(req.params.projectId, user_id, role || 'member');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

router.delete('/:projectId/members/:userId', (req, res) => {
    try {
        db.prepare('DELETE FROM project_members WHERE project_id = ? AND user_id = ?').run(req.params.projectId, req.params.userId);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

// --- Comments ---
router.post('/:projectId/comments', (req, res) => {
    const { user_id, content } = req.body;
    const io = req.io;
    try {
        const result = db.prepare('INSERT INTO project_comments (project_id, user_id, content) VALUES (?, ?, ?)').run(req.params.projectId, user_id, content);
        const newComment = db.prepare(`SELECT pc.*, u.username, u.profile_image FROM project_comments pc JOIN users u ON pc.user_id = u.id WHERE pc.id = ?`).get(result.lastInsertRowid);
        if (io) io.to(`project_${req.params.projectId}`).emit('new_comment', { projectId: req.params.projectId, comment: newComment });
        res.json(newComment);
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

// Team progress
router.get('/:projectId/progress/:date', (req, res) => {
    try {
        const items = db.prepare(`
            SELECT dp.checklist_item_id, dp.completed, u.id as user_id, u.username, u.profile_image
            FROM daily_progress dp JOIN users u ON dp.user_id = u.id JOIN checklist_items ci ON dp.checklist_item_id = ci.id JOIN checklists c ON ci.checklist_id = c.id
            WHERE c.project_id = ? AND dp.date = ? AND dp.completed = 1
        `).all(req.params.projectId, req.params.date);
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

module.exports = router;
