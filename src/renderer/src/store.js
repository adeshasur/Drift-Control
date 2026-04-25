import { create } from 'zustand'

function getLocalDateString() {
  const now = new Date()
  const tzOffsetMs = now.getTimezoneOffset() * 60 * 1000
  return new Date(now.getTime() - tzOffsetMs).toISOString().slice(0, 10)
}

export const useStore = create((set, get) => ({
  tasks: [],
  links: [],
  workspaces: [],
  activeWorkspaceId: null,
  selectedDate: getLocalDateString(),

  fetchWorkspaces: async () => {
    if (!window.api) return
    const data = await window.api.getWorkspaces()
    set({ workspaces: data })
    if (data.length === 0) {
      await get().addWorkspace({ name: 'General' })
    } else {
      set({ activeWorkspaceId: data[0].id })
      await get().fetchTasks(data[0].id, get().selectedDate)
    }
  },

  addWorkspace: async (workspace) => {
    if (!window.api) return
    const id = await window.api.addWorkspace(workspace)
    await get().fetchWorkspaces()
    set({ activeWorkspaceId: id })
  },

  setSelectedDate: async (date) => {
    set({ selectedDate: date })
    await get().fetchTasks(null, date)
  },

  fetchTasks: async (_, date) => {
    if (!window.api) return
    const targetDate = date || get().selectedDate
    const data = await window.api.getTasks({ workspaceId: null, date: targetDate })
    set({ tasks: data })
  },

  addTask: async ({ content, category = 'General', priority = 'Medium', dueDate = null, startNow = true, pomodoroFocus = 25, pomodoroBreak = 5 }) => {
    if (!window.api) throw new Error('Desktop API is unavailable.')
    let activeWorkspaceId = get().activeWorkspaceId || get().workspaces?.[0]?.id
    if (!activeWorkspaceId) {
      await get().fetchWorkspaces()
      activeWorkspaceId = get().activeWorkspaceId || get().workspaces?.[0]?.id
    }
    if (!activeWorkspaceId) throw new Error('No workspace found to attach the task.')
    const selectedDate = get().selectedDate
    await window.api.addTask({
      workspace_id: activeWorkspaceId,
      title: content,
      category,
      priority,
      due_date: dueDate,
      log_date: selectedDate,
      startNow,
      pomodoro_focus: pomodoroFocus,
      pomodoro_break: pomodoroBreak
    })
    await get().fetchTasks(null, selectedDate)
  },

  updateTaskMeta: async (payload) => {
    if (!window.api) return
    await window.api.updateTaskMeta(payload)
    await get().fetchTasks(null, get().selectedDate)
  },

  reorderTasks: async (ids) => {
    if (!window.api) return
    await window.api.reorderTasks({ ids })
    await get().fetchTasks(null, get().selectedDate)
  },

  deleteTask: async (id) => {
    if (!window.api) return
    await window.api.deleteTask(id)
    await get().fetchTasks(null, get().selectedDate)
  },

  toggleTimer: async (id, isRunning) => {
    if (!window.api) return
    await window.api.toggleTimer({ id, isRunning })
    await get().fetchTasks(null, get().selectedDate)
  },

  toggleCurrentTimer: async () => {
    if (!window.api) return
    await window.api.toggleCurrentTimer()
    await get().fetchTasks(null, get().selectedDate)
  },

  setTaskCompleted: async (id, completed) => {
    if (!window.api) return
    await window.api.setTaskCompleted({ id, completed })
    await get().fetchTasks(null, get().selectedDate)
  },

  setAlwaysOnTop: async (enabled) => {
    if (!window.api) return
    await window.api.setAlwaysOnTop(enabled)
  },

  fetchLinks: async (workspaceId) => {
    if (!window.api) return
    const data = await window.api.getLinks(workspaceId)
    set({ links: data })
  },

  addLink: async (link) => {
    if (!window.api) return
    const activeWorkspaceId = get().activeWorkspaceId
    if (!activeWorkspaceId) return
    await window.api.addLink({ ...link, workspace_id: activeWorkspaceId })
    await get().fetchLinks(activeWorkspaceId)
  },

  deleteLink: async (id) => {
    if (!window.api) return
    await window.api.deleteLink(id)
    await get().fetchLinks(get().activeWorkspaceId)
  }
}))
