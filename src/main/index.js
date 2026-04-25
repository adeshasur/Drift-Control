import { app, shell, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import iconPath from '../../resources/icon.png?asset'
const icon = nativeImage.createFromPath(iconPath)
import { initDB, setupIPC, getDB } from './database'

let mainWindow = null
let tray = null

function buildTrayMenu() {
  return Menu.buildFromTemplate([
    {
      label: 'Start/Pause Timer',
      click: () => {
        mainWindow?.webContents.send('shortcut-toggle-timer')
      }
    },
    {
      label: 'Show App',
      click: () => {
        if (!mainWindow) return
        if (!mainWindow.isVisible()) mainWindow.show()
        mainWindow.focus()
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.quit()
    }
  ])
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 860,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    titleBarStyle: 'hidden',
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  ipcMain.on('window-minimize', () => window.minimize())
  ipcMain.on('window-maximize', () => {
    if (window.isMaximized()) window.unmaximize()
    else window.maximize()
  })
  ipcMain.on('window-close', () => window.close())
  ipcMain.on('renderer-log', (_, ...args) => console.log('RENDERER:', ...args))

  ipcMain.handle('set-always-on-top', (_, enabled) => {
    window.setAlwaysOnTop(!!enabled, 'floating')
    return true
  })

  mainWindow = window

  window.on('ready-to-show', () => {
    window.maximize()
    window.show()
  })

  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    window.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return window
}

function setupTray() {
  tray = new Tray(icon)
  tray.setToolTip('Drift Control')
  tray.setContextMenu(buildTrayMenu())
  tray.on('click', () => {
    if (!mainWindow) return
    if (!mainWindow.isVisible()) mainWindow.show()
    else mainWindow.focus()
  })
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.kdj.driftcontrol')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  initDB()
  setupIPC(ipcMain, shell)

  const db = getDB()
  const workspacesCount = db.prepare('SELECT count(*) as count FROM workspaces').get().count
  if (workspacesCount === 0) {
    const insert = db.prepare('INSERT INTO workspaces (name) VALUES (?)')
    insert.run('Coding')
    insert.run('Study')
    insert.run('Personal')
  }

  createWindow()
  setupTray()

  globalShortcut.register('CommandOrControl+Space', () => {
    mainWindow?.webContents.send('shortcut-add-task')
    if (mainWindow && !mainWindow.isVisible()) mainWindow.show()
    mainWindow?.focus()
  })

  globalShortcut.register('CommandOrControl+Shift+P', () => {
    mainWindow?.webContents.send('shortcut-toggle-timer')
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
