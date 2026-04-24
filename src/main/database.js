import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'

let db;

export function initDB() {
  const dbPath = path.join(app.getPath('userData'), 'drift-control.sqlite');
  db = new Database(dbPath);
  
  db.pragma('journal_mode = WAL');
  
  // Create tables if they don't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      folder_path TEXT,
      github_url TEXT,
      deadline_date TEXT
    );
    
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER,
      title TEXT NOT NULL,
      priority TEXT DEFAULT 'Medium', -- Urgent, High, Medium, Low
      status TEXT DEFAULT 'Pending', -- Pending, In-Progress, Done
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    );
    
    CREATE TABLE IF NOT EXISTS links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    );
  `);
  
  // Migrate: add deadline_date if not exists
  try {
    db.prepare("SELECT deadline_date FROM workspaces LIMIT 1").get();
  } catch (e) {
    db.prepare("ALTER TABLE workspaces ADD COLUMN deadline_date TEXT").run();
  }

  return db;
}

export function getDB() {
  if (!db) return initDB();
  return db;
}

export function setupIPC(ipcMain, shell) {
  ipcMain.handle('get-workspaces', () => {
    return getDB().prepare('SELECT * FROM workspaces').all();
  });
  
  ipcMain.handle('add-workspace', (_, workspace) => {
    const stmt = getDB().prepare('INSERT INTO workspaces (name, folder_path, github_url) VALUES (?, ?, ?)');
    const info = stmt.run(workspace.name, workspace.folder_path, workspace.github_url);
    return info.lastInsertRowid;
  });

  ipcMain.handle('get-tasks', (_, workspaceId) => {
    if (workspaceId) {
      return getDB().prepare('SELECT * FROM tasks WHERE workspace_id = ?').all(workspaceId);
    }
    return getDB().prepare('SELECT * FROM tasks').all();
  });
  
  ipcMain.handle('add-task', (_, task) => {
    const stmt = getDB().prepare('INSERT INTO tasks (workspace_id, title, priority, status) VALUES (?, ?, ?, ?)');
    const info = stmt.run(task.workspace_id, task.title, task.priority, task.status);
    return info.lastInsertRowid;
  });

  ipcMain.handle('update-task-status', (_, { id, status }) => {
    const stmt = getDB().prepare('UPDATE tasks SET status = ? WHERE id = ?');
    stmt.run(status, id);
    return true;
  });

  ipcMain.handle('get-links', (_, workspaceId) => {
    return getDB().prepare('SELECT * FROM links WHERE workspace_id = ?').all(workspaceId);
  });

  ipcMain.handle('add-link', (_, link) => {
    const stmt = getDB().prepare('INSERT INTO links (workspace_id, title, url) VALUES (?, ?, ?)');
    const info = stmt.run(link.workspace_id, link.title, link.url);
    return info.lastInsertRowid;
  });

  ipcMain.handle('open-external', async (_, url) => {
    await shell.openExternal(url);
  });

  ipcMain.handle('open-path', async (_, path) => {
    await shell.openPath(path);
  });
}
