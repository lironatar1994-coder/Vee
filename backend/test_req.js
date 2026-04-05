const db = require('better-sqlite3')('database.sqlite');
console.log(db.prepare('SELECT id, content, checklist_id FROM checklist_items WHERE id = 1').get());
