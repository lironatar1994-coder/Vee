const Database = require('better-sqlite3');
const db = new Database('./database.sqlite');
const date = '2026-03-19';
const userId = 1;
const todayTasks = db.prepare(`
    SELECT ci.id, ci.target_date, ci.repeat_rule
    FROM checklist_items ci
    JOIN checklists c ON ci.checklist_id = c.id
    WHERE c.user_id = ? 
    AND ci.parent_item_id IS NULL
    AND (
        (ci.target_date IS NOT NULL AND ci.target_date = ?)
        OR (ci.target_date IS NULL AND ci.repeat_rule IS NOT NULL AND ci.repeat_rule != 'none')
    )
`).all(userId, date);
console.log('Today Tasks:', todayTasks.length);
console.log(JSON.stringify(todayTasks, null, 2));

const progress = db.prepare('SELECT checklist_item_id FROM daily_progress WHERE user_id = ? AND date = ? AND completed = 1').all(userId, date);
const completedIds = progress.map(p => p.checklist_item_id);
console.log('Completed IDs:', completedIds);

const todayCount = todayTasks.filter(t => !completedIds.includes(t.id)).length;
console.log('Today Count:', todayCount);
db.close();
