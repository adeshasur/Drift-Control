import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  getWorkspaces: () => ipcRenderer.invoke('get-workspaces'),
  addWorkspace: (workspace) => ipcRenderer.invoke('add-workspace', workspace),
  getTasks: (workspaceId) => ipcRenderer.invoke('get-tasks', workspaceId),
  addTask: (task) => ipcRenderer.invoke('add-task', task),
  updateTaskStatus: (data) => ipcRenderer.invoke('update-task-status', data),
  getLinks: (workspaceId) => ipcRenderer.invoke('get-links', workspaceId),
  addLink: (link) => ipcRenderer.invoke('add-link', link),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  openPath: (path) => ipcRenderer.invoke('open-path', path),
  openDeepWork: (taskTitle) => ipcRenderer.send('open-deep-work', taskTitle),
  onShortcutAddTask: (callback) => ipcRenderer.on('shortcut-add-task', callback),
  removeShortcutAddTask: (callback) => ipcRenderer.removeListener('shortcut-add-task', callback),
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
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
