import { create } from 'zustand'

export const useStore = create((set, get) => ({
  tasks: [],
  links: [],
  selectedDate: new Date().toISOString().split('T')[0],

  // Categories (Hidden/Auto)
  fetchWorkspaces: async () => {
    if (!window.api) return;
    const data = await window.api.getWorkspaces();
    set({ workspaces: data });
    // Auto-select first or create default
    if (data.length === 0) {
      await get().addWorkspace({ name: 'General' });
    } else {
      set({ activeWorkspaceId: data[0].id });
      get().fetchTasks(data[0].id, get().selectedDate);
    }
  },
  addWorkspace: async (workspace) => {
    if (!window.api) return;
    const id = await window.api.addWorkspace(workspace);
    await get().fetchWorkspaces();
    set({ activeWorkspaceId: id });
  },
  setSelectedDate: (date) => {
    set({ selectedDate: date });
    get().fetchTasks(null, date);
  },

  // Tasks
  fetchTasks: async (_, date) => {
    if (!window.api) return;
    const targetDate = date || get().selectedDate;
    // We fetch ALL tasks for the date, ignoring workspaceId filter in SQL
    const data = await window.api.getTasks({ workspaceId: null, date: targetDate });
    set({ tasks: data });
  },
  addTask: async (content) => {
    if (!window.api) return;
    // Default to first category (General)
    const activeWorkspaceId = get().activeWorkspaceId || 1;
    const selectedDate = get().selectedDate;
    await window.api.addTask({ workspace_id: activeWorkspaceId, title: content, log_date: selectedDate });
    await get().fetchTasks(null, selectedDate);
  },
  deleteTask: async (id) => {
    if (!window.api) return;
    await window.api.deleteTask(id);
    await get().fetchTasks(null, get().selectedDate);
  },

  // Links
  fetchLinks: async (workspaceId) => {
    if (!window.api) return;
    const data = await window.api.getLinks(workspaceId);
    set({ links: data });
  },
  addLink: async (link) => {
    if (!window.api) return;
    const activeWorkspaceId = get().activeWorkspaceId;
    if (!activeWorkspaceId) return;
    await window.api.addLink({ ...link, workspace_id: activeWorkspaceId });
    await get().fetchLinks(activeWorkspaceId);
  },
  deleteLink: async (id) => {
    if (!window.api) return;
    await window.api.deleteLink(id);
    await get().fetchLinks(get().activeWorkspaceId);
  }
}));
