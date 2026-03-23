const Database = require('better-sqlite3');
const db = new Database('./database.sqlite');
const items = db.prepare(`SELECT id, content, target_date FROM checklist_items WHERE target_date IS NOT NULL LIMIT 20`).all();
console.log(JSON.stringify(items, null, 2));
db.close();
