const db = require('better-sqlite3')('.tmp/data.db');
console.log(db.prepare(`SELECT url FROM files WHERE mime LIKE '%pdf%' ORDER BY id DESC LIMIT 5`).all());
