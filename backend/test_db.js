const db = require('better-sqlite3')('database.sqlite');
try {
    let checklist_id = 'INBOX';
    let itemId = 1;

    let actualChecklistId = checklist_id;
    if (typeof checklist_id === 'string' && (checklist_id === 'INBOX' || String(checklist_id).startsWith('NEW_INBOX_'))) {
        const itemContext = db.prepare(`
            SELECT ci.checklist_id, c.user_id, c.project_id 
            FROM checklist_items ci 
            JOIN checklists c ON ci.checklist_id = c.id 
            WHERE ci.id = ?
        `).get(itemId);
        
        if (itemContext) {
            if (checklist_id === 'INBOX') {
                let inbox = db.prepare(`SELECT id FROM checklists WHERE user_id = ? AND project_id IS NULL AND (title = '' OR title = 'תיבת המשימות' OR title = 'Inbox') ORDER BY order_index ASC`).get(itemContext.user_id);
                if (!inbox) {
                    const result = db.prepare('INSERT INTO checklists (user_id, title) VALUES (?, ?)').run(itemContext.user_id, '');
                    actualChecklistId = result.lastInsertRowid;
                } else {
                    actualChecklistId = inbox.id;
                }
            }
        }
    }

    // db.prepare('UPDATE checklist_items SET checklist_id = ? WHERE id = ?').run(actualChecklistId, itemId);
    console.log("SUCCESS ACTUAL ID:", actualChecklistId);
} catch (e) {
    console.error("ERROR IS:", e);
}
