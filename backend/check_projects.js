const Database = require('better-sqlite3');
const db = new Database('./database.sqlite');
const projects = db.prepare('SELECT id, title, is_routine FROM projects').all();
console.log(JSON.stringify(projects, null, 2));
db.close();
