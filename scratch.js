const db = require('better-sqlite3')('.tmp/data.db');
db.prepare("UPDATE files SET url = '/uploads/Newsletter_March_Week_5_d139268f31.pdf' WHERE url LIKE '%Newsletter_March_Week_5%'").run();
console.log('Updated DB');
