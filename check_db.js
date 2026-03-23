const Database = require('better-sqlite3');
const db = new Database('backend/database.sqlite');
const results = db.prepare('SELECT id, content, target_date FROM checklist_items WHERE target_date IS NOT NULL LIMIT 10').all();
console.log(JSON.stringify(results, null, 2));
