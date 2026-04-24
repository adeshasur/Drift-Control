import { app, shell, BrowserWindow, ipcMain, globalShortcut } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { initDB, setupIPC, getDB } from './database'

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    titleBarStyle: 'hidden',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // Window Controls IPC
  ipcMain.on('window-minimize', () => mainWindow.minimize());
  ipcMain.on('window-maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });
  ipcMain.on('window-close', () => mainWindow.close());

  mainWindow.on('ready-to-show', () => {
    mainWindow.maximize()
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow;
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Initialize SQLite Database
  initDB();

  // Setup IPC handlers
  setupIPC(ipcMain, shell);

  // Auto-seed initial categories if empty
  const db = getDB();
  const workspacesCount = db.prepare('SELECT count(*) as count FROM workspaces').get().count;
  if (workspacesCount === 0) {
    console.log('Seeding initial categories...');
    const insert = db.prepare('INSERT INTO workspaces (name) VALUES (?)');
    insert.run('Coding');
    insert.run('Study');
    insert.run('Personal');
  }

  // Deep Work Mode Window
  let deepWorkWindow = null;
  ipcMain.on('open-deep-work', (_, taskTitle) => {
    if (deepWorkWindow) {
      deepWorkWindow.focus();
      return;
    }
    deepWorkWindow = new BrowserWindow({
      width: 300,
      height: 150,
      alwaysOnTop: true,
      frame: false,
      transparent: true,
      resizable: false,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false
      }
    });

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      deepWorkWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/deep-work?task=${encodeURIComponent(taskTitle)}`)
    } else {
      deepWorkWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: `deep-work?task=${encodeURIComponent(taskTitle)}` })
    }

    deepWorkWindow.on('closed', () => {
      deepWorkWindow = null;
    });
  });

  const mainWindow = createWindow()

  // Global Shortcut: Ctrl+Space to Add Task
  globalShortcut.register('CommandOrControl+Space', () => {
    mainWindow.webContents.send('shortcut-add-task');
    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }
    mainWindow.focus();
  });

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
