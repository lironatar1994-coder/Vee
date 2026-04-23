const express = require('express');
const router = express.Router();
const db = require('../database');
const { calculateNextOccurrence, isOccurrenceOnDate } = require('../utils/dateUtils');
const userAuth = require('../middleware/userAuth');

// All routes in this router require user authentication
router.use(userAuth);

// --- Checklists API ---
// (Specific user-level checklist routes moved to users.js)

// PUT /api/checklists/:id
router.put('/checklists/:id', (req, res) => {
    const { id } = req.params;
    const { title } = req.body;
    try {
        // Enforce ownership check
        const checklist = db.prepare('SELECT user_id FROM checklists WHERE id = ?').get(id);
        if (!checklist || checklist.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Forbidden: You do not own this checklist' });
        }

        if (title !== undefined) {
            db.prepare('UPDATE checklists SET title = ? WHERE id = ?').run(title, id);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Update failed' });
    }
});

// DELETE /api/checklists/:id
router.delete('/checklists/:id', (req, res) => {
    try {
        const checklist = db.prepare('SELECT user_id FROM checklists WHERE id = ?').get(req.params.id);
        if (!checklist || checklist.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Forbidden: You do not own this checklist' });
        }

        db.prepare('DELETE FROM checklists WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Delete failed' });
    }
});

// --- Checklist Items API ---

// POST /api/checklists/:checklistId/items
router.post('/checklists/:checklistId/items', (req, res) => {
    const { checklistId } = req.params;
    let { content, order_index, parent_item_id, target_date, description, repeat_rule, time, duration, priority, reminder_minutes, prepend } = req.body;
    try {
        if (prepend) {
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

// PUT /api/items/:itemId
router.put('/items/:itemId', (req, res) => {
    const { itemId } = req.params;
    let { content, target_date, checklist_id, description, repeat_rule, time, duration, priority, reminder_minutes } = req.body;
    try {
        const updates = [];
        const params = [];
        let actualChecklistId = checklist_id;

        if (content !== undefined) { updates.push('content = ?'); params.push(content); }
        if (target_date !== undefined) { updates.push('target_date = ?'); params.push(target_date); }
        if (checklist_id !== undefined) {
             if (typeof checklist_id === 'string' && (checklist_id === 'INBOX' || String(checklist_id).startsWith('NEW_INBOX_'))) {
                const itemContext = db.prepare(`SELECT ci.checklist_id, c.user_id, c.project_id FROM checklist_items ci JOIN checklists c ON ci.checklist_id = c.id WHERE ci.id = ?`).get(itemId);
                if (itemContext) {
                    if (checklist_id === 'INBOX') {
                        let inbox = db.prepare(`SELECT id FROM checklists WHERE user_id = ? AND project_id IS NULL AND (title = '' OR title = 'תיבת המשימות' OR title = 'Inbox') ORDER BY order_index ASC`).get(itemContext.user_id);
                        actualChecklistId = inbox ? inbox.id : db.prepare('INSERT INTO checklists (user_id, title) VALUES (?, ?)').run(itemContext.user_id, '').lastInsertRowid;
                    } else if (String(checklist_id).startsWith('NEW_INBOX_')) {
                        const targetProjectId = String(checklist_id).replace('NEW_INBOX_', '');
                        let pInbox = db.prepare(`SELECT id FROM checklists WHERE project_id = ? AND (title = '' OR title = 'כללי' OR title = 'General') ORDER BY order_index ASC`).get(targetProjectId);
                        actualChecklistId = pInbox ? pInbox.id : db.prepare('INSERT INTO checklists (user_id, title, project_id) VALUES (?, ?, ?)').run(itemContext.user_id, '', targetProjectId).lastInsertRowid;
                    }
                }
            }
            updates.push('checklist_id = ?');
            params.push(actualChecklistId);
        }
        if (description !== undefined) { updates.push('description = ?'); params.push(description); }
        if (repeat_rule !== undefined) { updates.push('repeat_rule = ?'); params.push(repeat_rule); }
        if (time !== undefined) { updates.push('time = ?'); params.push(time); }
        if (duration !== undefined) { updates.push('duration = ?'); params.push(duration); }
        if (priority !== undefined) { updates.push('priority = ?'); params.push(priority); }
        if (reminder_minutes !== undefined) { updates.push('reminder_minutes = ?'); params.push(reminder_minutes); }

        if (updates.length > 0) {
            params.push(itemId);
            
            // If checklist_id is being updated, we must recursively update all sub-tasks to move with the parent
            if (checklist_id !== undefined) {
                db.prepare(`
                    UPDATE checklist_items 
                    SET checklist_id = ? 
                    WHERE id IN (
                        WITH RECURSIVE descendants AS (
                            SELECT id FROM checklist_items WHERE id = ?
                            UNION ALL
                            SELECT ci.id FROM checklist_items ci
                            JOIN descendants d ON ci.parent_item_id = d.id
                        )
                        SELECT id FROM descendants
                    )
                `).run(actualChecklistId, Number(itemId));
                
                // Remove checklist_id from the main updates list to avoid redundant update 
                // (though it doesn't hurt, it's cleaner this way)
                const checklistIdx = updates.indexOf('checklist_id = ?');
                if (checklistIdx !== -1) {
                    updates.splice(checklistIdx, 1);
                    params.splice(checklistIdx, 1);
                }
            }

            if (updates.length > 0) {
                db.prepare(`UPDATE checklist_items SET ${updates.join(', ')} WHERE id = ?`).run(...params);
            }
        }
        res.json({ success: true });
    } catch (err) {
        console.error('Update item failed:', err);
        res.status(500).json({ error: 'Update item failed' });
    }
});

// DELETE /api/items/:itemId
router.delete('/items/:itemId', (req, res) => {
    try {
        db.prepare('DELETE FROM checklist_items WHERE id = ?').run(req.params.itemId);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Delete item failed' });
    }
});

// PUT /api/items/bulk/datetime
router.put('/items/bulk/datetime', (req, res) => {
    const { itemIds, target_date, time } = req.body;
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) return res.status(400).json({ error: 'itemIds array is required' });
    try {
        const updates = [];
        const params = [];
        if (target_date !== undefined) { updates.push('target_date = ?'); params.push(target_date); }
        if (time !== undefined) { updates.push('time = ?'); params.push(time === '' ? null : time); }
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

// --- Comments API ---

// Task Comments
router.get('/checklist-items/:id/comments', (req, res) => {
    try {
        const comments = db.prepare(`
            SELECT cic.*, u.username, u.profile_image FROM checklist_item_comments cic JOIN users u ON cic.user_id = u.id WHERE cic.checklist_item_id = ? ORDER BY cic.created_at ASC
        `).all(req.params.id);
        res.json(comments);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch task comments' });
    }
});

router.post('/checklist-items/:id/comments', (req, res) => {
    const { user_id, content } = req.body;
    try {
        const result = db.prepare('INSERT INTO checklist_item_comments (checklist_item_id, user_id, content) VALUES (?, ?, ?)').run(req.params.id, user_id, content);
        const newComment = db.prepare(`
            SELECT cic.*, u.username, u.profile_image FROM checklist_item_comments cic JOIN users u ON cic.user_id = u.id WHERE cic.id = ?
        `).get(result.lastInsertRowid);
        res.json(newComment);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to post task comment' });
    }
});

// PUT /api/checklists/:id/reorder
router.put('/checklists/:id/reorder', (req, res) => {
    const { id } = req.params;
    const { itemIds } = req.body;
    if (!itemIds || !Array.isArray(itemIds)) return res.status(400).json({ error: 'itemIds array required' });

    try {
        const update = db.prepare('UPDATE checklist_items SET order_index = ? WHERE id = ? AND checklist_id = ?');
        db.transaction(() => {
            itemIds.forEach((itemId, idx) => {
                update.run(idx, itemId, Number(id));
            });
        })();
        res.json({ success: true });
    } catch (err) {
        console.error('Reorder checklist failed:', err);
        res.status(500).json({ error: 'Reorder failed' });
    }
});

// PUT /api/items/reorder (General/Sub-task reordering)
router.put('/items/reorder', (req, res) => {
    const { itemIds } = req.body;
    if (!itemIds || !Array.isArray(itemIds)) return res.status(400).json({ error: 'itemIds array required' });

    try {
        const update = db.prepare('UPDATE checklist_items SET order_index = ? WHERE id = ?');
        db.transaction(() => {
            itemIds.forEach((itemId, idx) => {
                update.run(idx, itemId);
            });
        })();
        res.json({ success: true });
    } catch (err) {
        console.error('Reorder items failed:', err);
        res.status(500).json({ error: 'Reorder failed' });
    }
});

module.exports = router;

