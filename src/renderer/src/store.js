import { create } from 'zustand'

export const useStore = create((set, get) => ({
  workspaces: [],
  activeWorkspaceId: null,
  tasks: [],
  links: [],

  // Workspaces
  fetchWorkspaces: async () => {
    if (!window.api) return;
    const data = await window.api.getWorkspaces();
    set({ workspaces: data });
    if (data.length > 0 && !get().activeWorkspaceId) {
      set({ activeWorkspaceId: data[0].id });
    }
  },
  addWorkspace: async (workspace) => {
    if (!window.api) return;
    const id = await window.api.addWorkspace(workspace);
    await get().fetchWorkspaces();
    set({ activeWorkspaceId: id });
  },
  setActiveWorkspace: (id) => {
    set({ activeWorkspaceId: id });
    get().fetchTasks(id);
    get().fetchLinks(id);
  },

  // Tasks
  fetchTasks: async (workspaceId) => {
    if (!window.api) return;
    const data = await window.api.getTasks(workspaceId);
    set({ tasks: data });
  },
  addTask: async (task) => {
    if (!window.api) return;
    const activeWorkspaceId = get().activeWorkspaceId;
    if (!activeWorkspaceId) return;
    await window.api.addTask({ ...task, workspace_id: activeWorkspaceId });
    await get().fetchTasks(activeWorkspaceId);
  },
  updateTaskStatus: async (id, status) => {
    if (!window.api) return;
    await window.api.updateTaskStatus({ id, status });
    await get().fetchTasks(get().activeWorkspaceId);
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
  }
}));
