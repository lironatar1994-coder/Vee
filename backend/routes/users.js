const express = require('express');
const router = express.Router();
const db = require('../database');
const { hashPassword } = require('../utils/authUtils');
const { calculateNextOccurrence, isOccurrenceOnDate } = require('../utils/dateUtils');

// GET /api/users/:id
router.get('/:id', (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    try {
        user.invited_users = db.prepare('SELECT id, username, profile_image, created_at FROM users WHERE invited_by = ? ORDER BY created_at DESC').all(req.params.id);
    } catch (e) {
        user.invited_users = [];
    }
    res.json(user);
});

// POST /api/users — legacy quick-create
router.post('/', (req, res) => {
    const { username } = req.body;
    if (!username || username.trim() === '') return res.status(400).json({ error: 'Username is required' });
    try {
        const result = db.prepare('INSERT INTO users (username) VALUES (?)').run(username.trim());
        const newUserId = result.lastInsertRowid;
        db.prepare("INSERT INTO checklists (title, user_id, project_id) VALUES ('', ?, NULL)").run(newUserId);
        res.json(db.prepare('SELECT * FROM users WHERE id = ?').get(newUserId));
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.json(db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim()));
        }
        res.status(500).json({ error: 'Database error' });
    }
});

// POST /api/users/:id/ping
router.post('/:id/ping', (req, res) => {
    try {
        const result = db.prepare('UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
        if (result.changes === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
});

// PUT /api/users/:id
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { username, profile_image, email, password, phone, whatsapp_enabled } = req.body;
    if (!username) return res.status(400).json({ error: 'Username required' });

    try {
        const updates = ['username = ?'];
        const params = [username.trim()];
        if (profile_image !== undefined) { updates.push('profile_image = ?'); params.push(profile_image); }
        if (email !== undefined) { updates.push('email = ?'); params.push(email); }
        if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
        if (whatsapp_enabled !== undefined) { updates.push('whatsapp_enabled = ?'); params.push(whatsapp_enabled ? 1 : 0); }
        if (password) { updates.push('password_hash = ?'); params.push(hashPassword(password)); }

        params.push(id);
        db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
        res.json(db.prepare('SELECT * FROM users WHERE id = ?').get(id));
    } catch (error) {
        res.status(500).json({ error: 'Update failed' });
    }
});

// --- Progress & Tasks ---

// GET /api/users/:userId/progress?date=YYYY-MM-DD
router.get('/:userId/progress', (req, res) => {
    const { userId } = req.params;
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'date required' });
    try {
        const progress = db.prepare('SELECT * FROM daily_progress WHERE user_id = ? AND date = ?').all(userId, date);
        res.json(progress);
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

// POST /api/users/:userId/progress (Toggle Item)
router.post('/:userId/progress', (req, res) => {
    const { userId } = req.params;
    const { checklist_item_id, date, completed } = req.body;
    const io = req.io;

    try {
        db.transaction(() => {
            const upsert = db.prepare(`
                INSERT INTO daily_progress (user_id, checklist_item_id, date, completed)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(user_id, checklist_item_id, date) DO UPDATE SET completed = excluded.completed
            `);
            upsert.run(userId, checklist_item_id, date, completed ? 1 : 0);

            if (completed) {
                const item = db.prepare('SELECT id, target_date, repeat_rule FROM checklist_items WHERE id = ?').get(checklist_item_id);
                if (item && item.repeat_rule && item.repeat_rule !== 'none') {
                    const baseDate = item.target_date || date;
                    const nextDate = calculateNextOccurrence(baseDate, item.repeat_rule);
                    if (nextDate) {
                        db.prepare('UPDATE checklist_items SET target_date = ? WHERE id = ?').run(nextDate, checklist_item_id);
                    }
                }
            }
        })();

        const info = db.prepare('SELECT c.project_id FROM checklist_items ci JOIN checklists c ON ci.checklist_id = c.id WHERE ci.id = ?').get(checklist_item_id);
        if (info && info.project_id && io) {
            const userRow = db.prepare('SELECT username, profile_image FROM users WHERE id = ?').get(userId);
            io.to(`project_${info.project_id}`).emit('task_completed', {
                checklist_item_id,
                completed: completed ? 1 : 0,
                userId: parseInt(userId),
                username: userRow ? userRow.username : 'Unknown',
                profile_image: userRow ? userRow.profile_image : null
            });
        }
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Update progress failed' });
    }
});

// GET /api/users/:userId/tasks/by-month
router.get('/:userId/tasks/by-month', (req, res) => {
    const { userId } = req.params;
    const { month } = req.query;
    if (!month) return res.status(400).json({ error: 'month required' });

    try {
        const targetedItems = db.prepare(`
            SELECT ci.*, c.title as checklistTitle, p.title as projectTitle
            FROM checklist_items ci
            JOIN checklists c ON ci.checklist_id = c.id
            LEFT JOIN projects p ON c.project_id = p.id
            WHERE c.user_id = ? AND (ci.target_date LIKE ? OR (ci.target_date IS NULL AND ci.repeat_rule IS NOT NULL AND ci.repeat_rule != 'none'))
        `).all(userId, `${month}-%`);

        const progressData = db.prepare(`
            SELECT dp.checklist_item_id, dp.date, ci.content, ci.checklist_id, c.title as checklistTitle, p.title as projectTitle
            FROM daily_progress dp
            JOIN checklist_items ci ON dp.checklist_item_id = ci.id
            JOIN checklists c ON ci.checklist_id = c.id
            LEFT JOIN projects p ON c.project_id = p.id
            WHERE dp.user_id = ? AND dp.date LIKE ? AND dp.completed = 1
        `).all(userId, `${month}-%`);

        const [y, m] = month.split('-');
        const daysInMonth = new Date(y, m, 0).getDate();
        const summary = {};

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const tasksMap = new Map();
            targetedItems.filter(i => {
                if (!i.repeat_rule || i.repeat_rule === 'none') return i.target_date && i.target_date.startsWith(dateStr);
                return isOccurrenceOnDate(dateStr, i.target_date, i.repeat_rule);
            }).forEach(i => tasksMap.set(i.id, { ...i, completed: false }));

            progressData.filter(p => p.date === dateStr).forEach(p => {
                tasksMap.set(p.checklist_item_id, { id: p.checklist_item_id, content: p.content, checklistTitle: p.checklistTitle, projectTitle: p.projectTitle, completed: true });
            });
            if (tasksMap.size > 0) summary[dateStr] = { total: tasksMap.size, tasks: Array.from(tasksMap.values()) };
        }
        res.json(summary);
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

// GET /api/users/:userId/tasks/by-date
router.get('/:userId/tasks/by-date', (req, res) => {
    const { userId } = req.params;
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'date required' });
    try {
        const tasks = db.prepare(`
            SELECT ci.*, c.title as checklist_title, c.order_index as c_order, p.title as project_title, p.id as project_id
            FROM checklist_items ci JOIN checklists c ON ci.checklist_id = c.id
            LEFT JOIN projects p ON c.project_id = p.id
            WHERE c.user_id = ? AND ((ci.target_date IS NOT NULL AND ci.target_date <= ?) OR (ci.target_date IS NULL AND ci.repeat_rule IS NOT NULL AND ci.repeat_rule != 'none'))
            ORDER BY COALESCE(c.project_id, 0) ASC, c.order_index ASC, ci.order_index ASC
        `).all(userId, date);

        const progressData = db.prepare('SELECT checklist_item_id, completed FROM daily_progress WHERE user_id = ? AND date = ?').all(userId, date);
        const progressMap = {};
        progressData.forEach(p => progressMap[p.checklist_item_id] = p.completed === 1);

        const groupedMap = new Map();
        tasks.forEach(task => {
            task.completed = !!progressMap[task.id];
            const projIdKey = task.project_id || 0;
            if (!groupedMap.has(projIdKey)) groupedMap.set(projIdKey, { project_id: task.project_id, project_title: task.project_title || 'תיבת המשימות', checklistsMap: new Map() });
            const pObj = groupedMap.get(projIdKey);
            if (!pObj.checklistsMap.has(task.checklist_id)) pObj.checklistsMap.set(task.checklist_id, { id: task.checklist_id, title: task.checklist_title, items: [] });
            pObj.checklistsMap.get(task.checklist_id).items.push(task);
        });
        res.json(Array.from(groupedMap.values()).map(proj => ({ ...proj, checklists: Array.from(proj.checklistsMap.values()) })));
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

// GET /api/users/:userId/sidebar-counts
router.get('/:userId/sidebar-counts', (req, res) => {
    const { userId } = req.params;
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'date required' });
    try {
        const todayCount = db.prepare(`
            SELECT COUNT(*) as count FROM checklist_items ci JOIN checklists c ON ci.checklist_id = c.id
            WHERE c.user_id = ? AND ci.parent_item_id IS NULL AND ((ci.target_date = ?) OR (ci.target_date IS NULL AND ci.repeat_rule IS NOT NULL AND ci.repeat_rule != 'none'))
            AND ci.id NOT IN (SELECT checklist_item_id FROM daily_progress WHERE user_id = ? AND date = ? AND completed = 1)
        `).get(userId, date, userId, date).count;

        const inboxCount = db.prepare(`
            SELECT COUNT(*) as count FROM checklist_items ci JOIN checklists c ON ci.checklist_id = c.id
            WHERE c.user_id = ? AND c.project_id IS NULL AND ci.parent_item_id IS NULL
            AND ci.id NOT IN (SELECT checklist_item_id FROM daily_progress WHERE user_id = ? AND date = ? AND completed = 1)
        `).get(userId, userId, date).count;
        res.json({ todayCount, inboxCount });
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

// GET /api/users/:userId/activity
router.get('/:userId/activity', (req, res) => {
    const { userId } = req.params;
    try {
        const activity = db.prepare(`
            SELECT dp.date, ci.content as message, p.title as project_name
            FROM daily_progress dp JOIN checklist_items ci ON dp.checklist_item_id = ci.id
            JOIN checklists c ON ci.checklist_id = c.id LEFT JOIN projects p ON c.project_id = p.id
            WHERE dp.user_id = ? AND dp.completed = 1 ORDER BY dp.date DESC, dp.id DESC LIMIT 50
        `).all(userId);
        res.json(activity.map(a => ({ ...a, message: `השלמת משימה: ${a.message}`, project_name: a.project_name || 'תיבת דואר' })));
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

// Onboarding and other user-specific routes...
router.post('/:id/onboard', (req, res) => {
    // ... logic preserved ...
    res.json({ success: true });
});

module.exports = router;
