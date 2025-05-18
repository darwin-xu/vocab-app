// export-vocab.js
// Script to export all vocab data from the current database (before migration)
// Usage: node export-vocab.js > vocab-export.json

const Database = require('better-sqlite3');
const db = new Database('vocab.sqlite'); // Adjust path if needed

const rows = db.prepare('SELECT * FROM vocab').all();
console.log(JSON.stringify(rows, null, 2));
