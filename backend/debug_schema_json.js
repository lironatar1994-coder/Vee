const Database = require('better-sqlite3');
const db = new Database('./database.sqlite');
const users = db.pragma('table_info(users)');
const checklists = db.pragma('table_info(checklists)');
console.log('USERS_JSON:', JSON.stringify(users));
console.log('CHECKLISTS_JSON:', JSON.stringify(checklists));
db.close();
