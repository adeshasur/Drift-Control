const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'drift-control', 'drift-control.sqlite');
const db = new Database(dbPath);

try {
  const info = db.prepare('INSERT INTO tasks (workspace_id, title, log_date) VALUES (?, ?, ?)').run(1, 'Terminal Test Task', '2026-04-24');
  console.log('Task inserted successfully, ID:', info.lastInsertRowid);
  const tasks = db.prepare('SELECT * FROM tasks WHERE log_date = ?').all('2026-04-24');
  console.log('Tasks for today:', tasks);
} catch (e) {
  console.error('Database Error:', e.message);
} finally {
  db.close();
}
