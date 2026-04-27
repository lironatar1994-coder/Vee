const express = require('express');
const router = express.Router();
const db = require('../database');
const { hashPassword } = require('../utils/authUtils');
const { calculateNextOccurrence, isOccurrenceOnDate } = require('../utils/dateUtils');
const userAuth = require('../middleware/userAuth');
const googleCalendarService = require('../services/googleCalendar');

// Protected routes (except legacy quick-create)
router.post('/', (req, res, next) => next()); // Allow legacy creation for now
router.use('/:id', userAuth);
router.use('/:userId/progress', userAuth);
router.use('/:userId/tasks', userAuth);
router.use('/:userId/sidebar-counts', userAuth);
router.use('/:userId/activity', userAuth);

// GET /api/users/:id
router.get('/:id', (req, res) => {
    // Both :id and req.user.id should match, but we use req.user.id for authority
    const userId = req.user.id;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    try {
        user.invited_users = db.prepare('SELECT id, username, profile_image, created_at FROM users WHERE invited_by = ? ORDER BY created_at DESC').all(userId);
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
        const result = db.prepare('UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.user.id);
        if (result.changes === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
});

// PUT /api/users/:id
router.put('/:id', async (req, res) => {
    const id = req.user.id; // Ignore id from params, use authenticated user id
    const { username, profile_image, email, password, phone, whatsapp_enabled } = req.body;
    if (!username) return res.status(400).json({ error: 'Username required' });

    try {
        const updates = ['username = ?'];
        const params = [username.trim()];
        if (profile_image !== undefined) { updates.push('profile_image = ?'); params.push(profile_image); }
        if (email !== undefined) { updates.push('email = ?'); params.push(email); }
        if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
        if (whatsapp_enabled !== undefined) { updates.push('whatsapp_enabled = ?'); params.push(whatsapp_enabled ? 1 : 0); }
        if (req.body.quick_add_settings !== undefined) { updates.push('quick_add_settings = ?'); params.push(JSON.stringify(req.body.quick_add_settings)); }
        
        if (password) { 
            const hash = await hashPassword(password);
            updates.push('password_hash = ?'); 
            params.push(hash); 
        }

        params.push(id);
        db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
        res.json(db.prepare('SELECT * FROM users WHERE id = ?').get(id));
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Update failed' });
    }
});

// --- Progress & Tasks ---

// GET /api/users/:userId/progress?date=YYYY-MM-DD
router.get('/:userId/progress', (req, res) => {
    const userId = req.user.id;
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
    const userId = req.user.id;
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
    const userId = req.user.id;
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
    const userId = req.user.id;
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
    const userId = req.user.id;
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

        const projectCountsRows = db.prepare(`
            SELECT c.project_id, COUNT(*) as count 
            FROM checklist_items ci JOIN checklists c ON ci.checklist_id = c.id
            WHERE c.user_id = ? AND c.project_id IS NOT NULL AND ci.parent_item_id IS NULL
            AND ci.id NOT IN (SELECT checklist_item_id FROM daily_progress WHERE user_id = ? AND date = ? AND completed = 1)
            GROUP BY c.project_id
        `).all(userId, userId, date);

        const projectCounts = {};
        projectCountsRows.forEach(row => {
            projectCounts[row.project_id] = row.count;
        });

        res.json({ todayCount, inboxCount, projectCounts });
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

// GET /api/users/:userId/activity
router.get('/:userId/activity', userAuth, (req, res) => {
    const userId = req.user.id;
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

// --- User Checklists ---

// GET /api/users/:userId/checklists
router.get('/:userId/checklists', userAuth, (req, res) => {
    const userId = req.user.id;
    try {
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
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

// GET /api/users/:userId/inbox
router.get('/:userId/inbox', userAuth, (req, res) => {
    const userId = req.user.id;
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
        res.status(500).json({ error: 'Failed' });
    }
});

// POST /api/users/:userId/checklists
router.post('/:userId/checklists', userAuth, (req, res) => {
    const userId = req.user.id;
    const { title, items, project_id } = req.body;
    try {
        let newChecklistId;
        db.transaction(() => {
            const result = db.prepare('INSERT INTO checklists (user_id, title, project_id) VALUES (?, ?, ?)').run(userId, title || '', project_id || null);
            newChecklistId = result.lastInsertRowid;
            if (items && Array.isArray(items)) {
                const insertItem = db.prepare('INSERT INTO checklist_items (checklist_id, content, order_index) VALUES (?, ?, ?)');
                items.forEach((itemContent, index) => insertItem.run(newChecklistId, itemContent, index));
            }
        })();
        const c = db.prepare('SELECT * FROM checklists WHERE id = ?').get(newChecklistId);
        c.items = [];
        res.json(c);
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

// POST /api/users/:userId/checklists/from-template
router.post('/:userId/checklists/from-template', userAuth, (req, res) => {
    const userId = req.user.id;
    const { templateId, project_id } = req.body;
    try {
        const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(templateId);
        if (!template) return res.status(404).json({ error: 'Template not found' });
        const items = db.prepare('SELECT content FROM template_items WHERE template_id = ?').all(templateId);
        let newChecklistId;
        db.transaction(() => {
            const result = db.prepare('INSERT INTO checklists (user_id, title, project_id) VALUES (?, ?, ?)').run(userId, template.title, project_id || null);
            newChecklistId = result.lastInsertRowid;
            const insertItem = db.prepare('INSERT INTO checklist_items (checklist_id, content, order_index) VALUES (?, ?, ?)');
            items.forEach((item, index) => insertItem.run(newChecklistId, item.content, index));
        })();
        const c = db.prepare('SELECT * FROM checklists WHERE id = ?').get(newChecklistId);
        c.items = db.prepare('SELECT * FROM checklist_items WHERE checklist_id = ? ORDER BY order_index ASC').all(newChecklistId);
        res.json(c);
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

// GET /api/users/current — Helper for onboarding to get fresh user data
router.get('/current', userAuth, (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
});

// GET /api/users/:userId/projects
router.get('/:userId/projects', userAuth, (req, res) => {
    const userId = req.user.id; // Corrected: use authenticated user id
    try {
        const projects = db.prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY order_index ASC, created_at ASC').all(userId);
        res.json(projects);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

// POST /api/users/:userId/projects
router.post('/:userId/projects', userAuth, (req, res) => {
    const userId = req.user.id;
    const { title, color, parent_id, description } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    try {
        const projectColor = color || '#6366f1';
        const parentId = parent_id || null;
        const maxOrder = db.prepare('SELECT MAX(order_index) as maxOrder FROM projects WHERE user_id = ?').get(userId);
        const nextOrder = (maxOrder?.maxOrder || 0) + 1;
        const result = db.prepare('INSERT INTO projects (user_id, title, color, parent_id, order_index, description) VALUES (?, ?, ?, ?, ?, ?)').run(userId, title, projectColor, parentId, nextOrder, description || null);
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
        res.json(project);
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

// POST /api/users/:id/onboard
router.post('/:id/onboard', userAuth, (req, res) => {
    const userId = req.user.id;
    const { username, operations } = req.body;

    const RESERVED_NAMES = ['admin', 'administrator', 'system', 'root', 'vee', 'support', 'management'];
    if (RESERVED_NAMES.includes((username || '').toLowerCase().trim())) {
        return res.status(400).json({ error: 'THIS_NAME_IS_RESERVED', message: 'זהו שם שמור במערכת. בחר שם אחר.' });
    }

    try {
        db.transaction(() => {
            // 1. Update user setup state (UNIQUE constraint removed in migration)
            db.prepare('UPDATE users SET username = ?, is_onboarded = 1 WHERE id = ?').run(username, userId);

            // 2. Process onboarding operations
            if (operations && Array.isArray(operations)) {
                for (const op of operations) {
                    if (op.type === 'CREATE_PROJECT') {
                        const result = db.prepare('INSERT INTO projects (user_id, title) VALUES (?, ?)').run(userId, op.projectName);
                        db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(result.lastInsertRowid, userId, 'owner');
                    } 
                    else if (op.type === 'APPLY_TEMPLATE') {
                        const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(op.templateId);
                        if (template) {
                            const pRes = db.prepare('INSERT INTO projects (user_id, title, description) VALUES (?, ?, ?)').run(userId, template.title, template.description);
                            const projectId = pRes.lastInsertRowid;
                            db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(projectId, userId, 'owner');
                            
                            const cRes = db.prepare('INSERT INTO checklists (user_id, project_id, title) VALUES (?, ?, ?)').run(userId, projectId, template.title);
                            const checklistId = cRes.lastInsertRowid;
                            
                            const items = db.prepare('SELECT * FROM template_items WHERE template_id = ?').all(op.templateId);
                            const insertItem = db.prepare('INSERT INTO checklist_items (checklist_id, content) VALUES (?, ?)');
                            for (const item of items) {
                                insertItem.run(checklistId, item.content);
                            }
                        }
                    } 
                    else if (op.type === 'CREATE_TASK') {
                        let inbox = db.prepare('SELECT id FROM checklists WHERE user_id = ? AND project_id IS NULL LIMIT 1').get(userId);
                        if (!inbox) {
                            const iRes = db.prepare("INSERT INTO checklists (title, user_id, project_id) VALUES ('', ?, NULL)").run(userId);
                            inbox = { id: iRes.lastInsertRowid };
                        }
                        db.prepare('INSERT INTO checklist_items (checklist_id, content, repeat_rule, time) VALUES (?, ?, ?, ?)').run(
                            inbox.id, op.taskName, op.repeatRule || null, op.time || null
                        );
                    }
                }
            }
        })();

        const updatedUser = db.prepare('SELECT id, username, email, phone, profile_image, is_onboarded, whatsapp_enabled FROM users WHERE id = ?').get(userId);
        updatedUser.invited_users = [];
        res.json({ success: true, user: updatedUser });
    } catch (err) {
        console.error('Onboarding processing error:', err);
        res.status(500).json({ error: 'התהליך נכשל. אנא נסה שוב.' });
    }
});

// --- Google Calendar Integration ---

// GET /api/users/:id/google/events
router.get('/:id/google/events', async (req, res) => {
    const userId = req.params.id === 'current' ? req.user.id : req.params.id;
    const { timeMin, timeMax } = req.query;
    try {
        const events = await googleCalendarService.getEvents(db, userId, timeMin, timeMax);
        res.json(events);
    } catch (e) {
        console.error('Failed bringing google events to user', userId, e.message);
        res.json([]);
    }
});

// DELETE /api/users/:id/google
router.delete('/:id/google', (req, res) => {
    const userId = req.params.id === 'current' ? req.user.id : req.params.id;
    try {
        db.prepare('UPDATE users SET google_access_token = NULL, google_refresh_token = NULL, google_token_expiry = NULL, google_calendar_email = NULL WHERE id = ?').run(userId);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to disconnect Google Calendar' });
    }
});

// DELETE /api/users/current (Soft Delete with Shadowing)
router.delete('/current', userAuth, (req, res) => {
    const userId = req.user.id;
    const user = db.prepare('SELECT username, email, phone FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const timestamp = Date.now();
    const deletedUsername = `${user.username}__del_${timestamp}`;
    const deletedEmail = user.email ? `${user.email}__del_${timestamp}` : null;
    const deletedPhone = user.phone ? `${user.phone}__del_${timestamp}` : null;

    try {
        db.prepare(`
            UPDATE users 
            SET is_deleted = 1, 
                deleted_at = CURRENT_TIMESTAMP,
                username = ?,
                email = ?,
                phone = ?
            WHERE id = ?
        `).run(deletedUsername, deletedEmail, deletedPhone, userId);
        res.json({ success: true, message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ error: 'Failed to delete account' });
    }
});

module.exports = router;
