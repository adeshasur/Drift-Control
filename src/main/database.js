import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'

let db

function nowIso() {
  return new Date().toISOString()
}

function computeElapsed(lastStartedAt) {
  if (!lastStartedAt) return 0
  const startTime = new Date(lastStartedAt).getTime()
  if (isNaN(startTime)) return 0
  const elapsed = Math.floor((Date.now() - startTime) / 1000)
  return Math.max(0, elapsed)
}

function pauseTask(taskId) {
  const task = db.prepare('SELECT duration, last_started_at FROM tasks WHERE id = ?').get(taskId)
  if (!task) return
  const newDuration = (task.duration || 0) + computeElapsed(task.last_started_at)
  db.prepare('UPDATE tasks SET is_running = 0, duration = ?, last_started_at = NULL WHERE id = ?').run(newDuration, taskId)
}

function pauseAllExcept(taskId) {
  const running = db.prepare('SELECT id FROM tasks WHERE is_running = 1 AND id != ?').all(taskId)
  running.forEach((task) => pauseTask(task.id))
}

export function initDB() {
  const dbPath = path.join(app.getPath('userData'), 'drift-control.sqlite')
  db = new Database(dbPath)

  db.pragma('journal_mode = WAL')

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
      category TEXT DEFAULT 'General',
      priority TEXT DEFAULT 'Medium',
      due_date TEXT,
      order_index INTEGER DEFAULT 0,
      pomodoro_focus INTEGER DEFAULT 25,
      pomodoro_break INTEGER DEFAULT 5,
      log_date TEXT DEFAULT (date('now')),
      duration INTEGER DEFAULT 0,
      is_running INTEGER DEFAULT 0,
      last_started_at DATETIME,
      completed_at DATETIME,
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
  `)

  const taskMigrations = [
    ['duration', "ALTER TABLE tasks ADD COLUMN duration INTEGER DEFAULT 0"],
    ['is_running', "ALTER TABLE tasks ADD COLUMN is_running INTEGER DEFAULT 0"],
    ['last_started_at', "ALTER TABLE tasks ADD COLUMN last_started_at DATETIME"],
    ['completed_at', 'ALTER TABLE tasks ADD COLUMN completed_at DATETIME'],
    ["category", "ALTER TABLE tasks ADD COLUMN category TEXT DEFAULT 'General'"],
    ["priority", "ALTER TABLE tasks ADD COLUMN priority TEXT DEFAULT 'Medium'"],
    ['due_date', 'ALTER TABLE tasks ADD COLUMN due_date TEXT'],
    ['order_index', 'ALTER TABLE tasks ADD COLUMN order_index INTEGER DEFAULT 0'],
    ['pomodoro_focus', 'ALTER TABLE tasks ADD COLUMN pomodoro_focus INTEGER DEFAULT 25'],
    ['pomodoro_break', 'ALTER TABLE tasks ADD COLUMN pomodoro_break INTEGER DEFAULT 5']
  ]

  taskMigrations.forEach(([column, sql]) => {
    try {
      db.prepare(`SELECT ${column} FROM tasks LIMIT 1`).get()
    } catch {
      db.prepare(sql).run()
    }
  })

  try {
    db.prepare('SELECT deadline_date FROM workspaces LIMIT 1').get()
  } catch {
    db.prepare('ALTER TABLE workspaces ADD COLUMN deadline_date TEXT').run()
  }

  db.prepare('UPDATE tasks SET order_index = id WHERE order_index IS NULL OR order_index = 0').run()

  return db
}

export function getDB() {
  if (!db) return initDB()
  return db
}

export function setupIPC(ipcMain, shell) {
  ipcMain.handle('get-workspaces', () => {
    const dbi = getDB()
    const workspaces = dbi.prepare('SELECT * FROM workspaces').all()
    console.log('IPC: get-workspaces', workspaces)
    
    // Auto-seed a task for today if none exist, just for testing
    const now = new Date()
    const tzOffsetMs = now.getTimezoneOffset() * 60 * 1000
    const today = new Date(now.getTime() - tzOffsetMs).toISOString().slice(0, 10)
    
    const taskCount = dbi.prepare('SELECT count(*) as count FROM tasks WHERE log_date = ?').get(today).count
    if (taskCount === 0 && workspaces.length > 0) {
      console.log('IPC: Seeding a welcome task for local date:', today)
      dbi.prepare('INSERT INTO tasks (workspace_id, title, log_date, category, priority) VALUES (?, ?, ?, ?, ?)').run(
        workspaces[0].id, 'Welcome! Type above to add your first task.', today, 'General', 'High'
      )
    }
    
    return workspaces
  })

  ipcMain.handle('add-workspace', (_, workspace) => {
    const stmt = getDB().prepare('INSERT INTO workspaces (name, folder_path, github_url) VALUES (?, ?, ?)')
    const info = stmt.run(workspace.name, workspace.folder_path, workspace.github_url)
    return info.lastInsertRowid
  })

  ipcMain.handle('get-tasks', (_, { workspaceId, date }) => {
    console.log('IPC: get-tasks called', { workspaceId, date })
    const dbi = getDB()
    const baseOrder = `
      ORDER BY
        completed_at IS NOT NULL,
        CASE priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END,
        due_date IS NULL,
        due_date ASC,
        is_running DESC,
        order_index ASC,
        created_at DESC`

    if (workspaceId && date) {
      const tasks = dbi.prepare(`SELECT * FROM tasks WHERE workspace_id = ? AND log_date = ? ${baseOrder}`).all(workspaceId, date)
      console.log(`IPC: returning ${tasks.length} tasks for workspace ${workspaceId}`)
      return tasks
    }
    if (date) {
      const tasks = dbi.prepare(`SELECT * FROM tasks WHERE log_date = ? ${baseOrder}`).all(date)
      console.log(`IPC: returning ${tasks.length} tasks for date ${date}`)
      return tasks
    }
    return []
  })

  ipcMain.handle('add-task', (_, { workspace_id, title, category, priority, due_date, log_date, startNow, pomodoro_focus, pomodoro_break }) => {
    console.log('IPC: add-task called', { workspace_id, title, category, priority, due_date, log_date, startNow })
    const dbi = getDB()
    try {
      const nextOrder = dbi.prepare('SELECT COALESCE(MAX(order_index), 0) + 1 as nextValue FROM tasks WHERE log_date = ?').get(log_date)?.nextValue || 1
      const stmt = dbi.prepare(
        `INSERT INTO tasks
          (workspace_id, title, category, priority, due_date, order_index, pomodoro_focus, pomodoro_break, log_date, is_running, last_started_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      const info = stmt.run(
        workspace_id,
        title,
        category || 'General',
        priority || 'Medium',
        due_date || null,
        nextOrder,
        Math.max(1, Number(pomodoro_focus || 25)),
        Math.max(1, Number(pomodoro_break || 5)),
        log_date,
        startNow ? 1 : 0,
        startNow ? nowIso() : null
      )

      console.log('IPC: task inserted', info.lastInsertRowid)
      if (startNow) pauseAllExcept(info.lastInsertRowid)
      return info.lastInsertRowid
    } catch (err) {
      console.error('IPC: add-task ERROR', err)
      throw err
    }
  })

  ipcMain.handle('update-task-meta', (_, payload) => {
    const dbi = getDB()
    const updates = []
    const values = []

    const allowed = ['title', 'category', 'priority', 'due_date', 'pomodoro_focus', 'pomodoro_break']
    allowed.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(payload, key)) {
        updates.push(`${key} = ?`)
        values.push(payload[key])
      }
    })

    if (updates.length === 0) return false
    values.push(payload.id)
    dbi.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values)
    return true
  })

  ipcMain.handle('reorder-tasks', (_, { ids }) => {
    const dbi = getDB()
    const stmt = dbi.prepare('UPDATE tasks SET order_index = ? WHERE id = ?')
    const tx = dbi.transaction((taskIds) => {
      taskIds.forEach((id, index) => stmt.run(index + 1, id))
    })
    tx(ids)
    return true
  })

  ipcMain.handle('set-task-completed', (_, { id, completed }) => {
    const dbi = getDB()
    if (completed) {
      const task = dbi.prepare('SELECT duration, is_running, last_started_at FROM tasks WHERE id = ?').get(id)
      let newDuration = task?.duration || 0
      if (task?.is_running) newDuration += computeElapsed(task.last_started_at)
      dbi.prepare('UPDATE tasks SET completed_at = ?, is_running = 0, duration = ?, last_started_at = NULL WHERE id = ?').run(nowIso(), newDuration, id)
    } else {
      dbi.prepare('UPDATE tasks SET completed_at = NULL WHERE id = ?').run(id)
    }
    return true
  })

  ipcMain.handle('toggle-timer', (_, { id, isRunning }) => {
    const dbi = getDB()
    if (isRunning) {
      pauseAllExcept(id)
      dbi.prepare('UPDATE tasks SET is_running = 1, completed_at = NULL, last_started_at = ? WHERE id = ?').run(nowIso(), id)
    } else {
      pauseTask(id)
    }
    return true
  })

  ipcMain.handle('toggle-current-timer', () => {
    const dbi = getDB()
    const running = dbi.prepare('SELECT id FROM tasks WHERE is_running = 1 ORDER BY last_started_at DESC LIMIT 1').get()
    if (running) {
      pauseTask(running.id)
      return { state: 'paused' }
    }

    const latest = dbi.prepare("SELECT id FROM tasks WHERE completed_at IS NULL ORDER BY due_date IS NULL, due_date ASC, created_at DESC LIMIT 1").get()
    if (!latest) return { state: 'none' }
    pauseAllExcept(latest.id)
    dbi.prepare('UPDATE tasks SET is_running = 1, last_started_at = ? WHERE id = ?').run(nowIso(), latest.id)
    return { state: 'running' }
  })

  ipcMain.handle('delete-task', (_, id) => getDB().prepare('DELETE FROM tasks WHERE id = ?').run(id))

  ipcMain.handle('get-links', (_, workspaceId) => getDB().prepare('SELECT * FROM links WHERE workspace_id = ?').all(workspaceId))

  ipcMain.handle('add-link', (_, link) => {
    const stmt = getDB().prepare('INSERT INTO links (workspace_id, title, url) VALUES (?, ?, ?)')
    const info = stmt.run(link.workspace_id, link.title, link.url)
    return info.lastInsertRowid
  })

  ipcMain.handle('delete-link', (_, id) => getDB().prepare('DELETE FROM links WHERE id = ?').run(id))

  ipcMain.handle('open-external', async (_, url) => shell.openExternal(url))
  ipcMain.handle('open-path', async (_, targetPath) => shell.openPath(targetPath))
}
