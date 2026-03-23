const Database = require('better-sqlite3');
const db = new Database('./database.sqlite');
console.log('Users Table Info:');
console.log(db.pragma('table_info(users)'));
console.log('Checklists Table Info:');
console.log(db.pragma('table_info(checklists)'));
db.close();
