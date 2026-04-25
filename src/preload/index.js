import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  getWorkspaces: () => ipcRenderer.invoke('get-workspaces'),
  addWorkspace: (workspace) => ipcRenderer.invoke('add-workspace', workspace),
  getTasks: (payload) => ipcRenderer.invoke('get-tasks', payload),
  addTask: (task) => ipcRenderer.invoke('add-task', task),
  updateTaskMeta: (payload) => ipcRenderer.invoke('update-task-meta', payload),
  reorderTasks: (payload) => ipcRenderer.invoke('reorder-tasks', payload),
  deleteTask: (id) => ipcRenderer.invoke('delete-task', id),
  toggleTimer: (data) => ipcRenderer.invoke('toggle-timer', data),
  toggleCurrentTimer: () => ipcRenderer.invoke('toggle-current-timer'),
  setTaskCompleted: (data) => ipcRenderer.invoke('set-task-completed', data),
  setAlwaysOnTop: (enabled) => ipcRenderer.invoke('set-always-on-top', enabled),
  getLinks: (workspaceId) => ipcRenderer.invoke('get-links', workspaceId),
  addLink: (link) => ipcRenderer.invoke('add-link', link),
  deleteLink: (id) => ipcRenderer.invoke('delete-link', id),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  openPath: (path) => ipcRenderer.invoke('open-path', path),
  onShortcutAddTask: (callback) => ipcRenderer.on('shortcut-add-task', callback),
  removeShortcutAddTask: (callback) => ipcRenderer.removeListener('shortcut-add-task', callback),
  onShortcutToggleTimer: (callback) => ipcRenderer.on('shortcut-toggle-timer', callback),
  removeShortcutToggleTimer: (callback) => ipcRenderer.removeListener('shortcut-toggle-timer', callback),
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  log: (...args) => ipcRenderer.send('renderer-log', ...args)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
