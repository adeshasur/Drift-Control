import React, { useEffect, useState } from 'react'
import { useStore } from './store'
import { Folder, Code, Plus, Search, CheckCircle, Clock, AlertCircle, Link as LinkIcon, Play, X } from 'lucide-react'

function DeepWorkOverlay({ taskTitle }) {
  const [time, setTime] = useState(25 * 60);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(t => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl border border-glass-border draggable rounded-xl text-white">
      <div className="absolute top-2 right-2 no-drag cursor-pointer opacity-50 hover:opacity-100" onClick={() => window.close()}>
        <X size={16} />
      </div>
      <h3 className="text-sm font-semibold tracking-wider text-zinc-300 uppercase truncate px-4">{taskTitle}</h3>
      <div className="text-5xl font-bold mt-2 tracking-widest">{formatTime(time)}</div>
    </div>
  );
}

function App() {
  console.log('Drift Control App is mounting...');
  const { 
    workspaces, activeWorkspaceId, tasks, links, 
    fetchWorkspaces, setActiveWorkspace, addWorkspace,
    addTask, updateTaskStatus
  } = useStore();

  const [isAddingWorkspace, setIsAddingWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');

  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  
  useEffect(() => {
    fetchWorkspaces();
    
    // Global shortcut listener from Electron
    if (window.api && window.api.onShortcutAddTask) {
      window.api.onShortcutAddTask(() => {
        setIsAddingTask(true);
      });
    }

    return () => {
      if (window.api && window.api.removeShortcutAddTask) {
        window.api.removeShortcutAddTask(() => {});
      }
    }
  }, []);

  const handleAddWorkspace = async (e) => {
    if (e.key === 'Enter' && newWorkspaceName.trim()) {
      await addWorkspace({ name: newWorkspaceName.trim(), folder_path: '', github_url: '' });
      setNewWorkspaceName('');
      setIsAddingWorkspace(false);
    }
  };

  const handleAddTask = async (e) => {
    if (e.key === 'Enter' && newTaskTitle.trim()) {
      await addTask({ title: newTaskTitle.trim(), priority: 'Medium', status: 'Pending' });
      setNewTaskTitle('');
      setIsAddingTask(false);
    }
  };

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);

  const openPath = (path) => {
    if (path) window.api.openPath(path);
  }

  const openUrl = (url) => {
    if (url) window.api.openExternal(url);
  }

  const handleDeepWork = (task) => {
    const title = task ? task.title : 'Focus Mode';
    window.api.openDeepWork(title);
  }

  // Simple Hash Router for the separate Deep Work window
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (hash.startsWith('#/deep-work')) {
    const urlParams = new URLSearchParams(hash.split('?')[1]);
    const taskTitle = urlParams.get('task') || 'Focus Session';
    return <DeepWorkOverlay taskTitle={taskTitle} />;
  }

  return (
    <div className="flex h-screen w-full font-sans draggable">
      {/* Sidebar - Workspaces */}
      <div className="w-64 glass-panel border-l-0 border-t-0 border-b-0 flex flex-col no-drag">
        <div className="p-4 pt-10">
          <h1 className="text-xl font-bold tracking-wider mb-6 flex items-center">
            <span className="w-3 h-3 rounded-full bg-white mr-2"></span>
            DRIFT CONTROL
          </h1>
          
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xs uppercase tracking-widest text-zinc-400 font-semibold">Workspaces</h2>
            <button onClick={() => setIsAddingWorkspace(true)} className="text-zinc-400 hover:text-white transition-colors">
              <Plus size={16} />
            </button>
          </div>

          <div className="space-y-1">
            {workspaces.map(ws => (
              <div 
                key={ws.id} 
                onClick={() => setActiveWorkspace(ws.id)}
                className={`px-3 py-2 rounded-md cursor-pointer transition-colors duration-200 ${
                  activeWorkspaceId === ws.id 
                    ? 'bg-white/10 text-white font-medium' 
                    : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                }`}
              >
                {ws.name}
              </div>
            ))}
            
            {isAddingWorkspace && (
              <input
                autoFocus
                type="text"
                placeholder="New Workspace..."
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                onKeyDown={handleAddWorkspace}
                onBlur={() => setIsAddingWorkspace(false)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-1.5 text-sm outline-none focus:border-zinc-500"
              />
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col no-drag overflow-hidden">
        {activeWorkspace ? (
          <>
            {/* Header / Smart Switch */}
            <div className="h-20 border-b border-glass-border flex items-center justify-between px-8 bg-black/20">
              <div>
                <h2 className="text-2xl font-bold">{activeWorkspace.name}</h2>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => openPath(activeWorkspace.folder_path)}
                  className="btn-secondary flex items-center gap-2"
                  title={activeWorkspace.folder_path || "No folder linked"}
                >
                  <Folder size={16} /> Folder
                </button>
                <button 
                  onClick={() => openUrl(activeWorkspace.github_url)}
                  className="btn-secondary flex items-center gap-2"
                  title={activeWorkspace.github_url || "No github linked"}
                >
                  <Code size={16} /> Repo
                </button>
                <button onClick={() => handleDeepWork()} className="btn-primary flex items-center gap-2 ml-4 no-drag">
                  <Play size={16} /> Deep Work
                </button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Task Board */}
              <div className="flex-1 p-8 overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Clock size={18} /> Current Tasks
                  </h3>
                  <button 
                    onClick={() => setIsAddingTask(true)}
                    className="flex items-center gap-1 text-sm bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full transition-colors no-drag"
                  >
                    <Plus size={14} /> Add Task
                    <span className="ml-2 text-xs text-zinc-500">Ctrl+Space</span>
                  </button>
                </div>

                {isAddingTask && (
                  <div className="mb-4 bg-zinc-900/50 p-4 rounded-lg border border-glass-border">
                    <input
                      autoFocus
                      type="text"
                      placeholder="What needs to be done? (Press Enter)"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={handleAddTask}
                      onBlur={() => setIsAddingTask(false)}
                      className="w-full bg-transparent text-lg outline-none placeholder:text-zinc-600"
                    />
                  </div>
                )}

                <div className="grid grid-cols-3 gap-6">
                  {/* Pending */}
                  <div className="space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-zinc-500"></span> Pending
                    </div>
                    {tasks.filter(t => t.status === 'Pending').map(task => (
                      <div key={task.id} className="glass-panel p-4 rounded-lg hover:border-zinc-600 transition-colors cursor-pointer" onClick={() => updateTaskStatus(task.id, 'In-Progress')}>
                        <h4 className="font-medium text-sm">{task.title}</h4>
                        <div className="mt-3 flex justify-between items-center">
                          <span className="text-[10px] uppercase px-2 py-0.5 rounded-sm bg-white/10 text-zinc-300">
                            {task.priority}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* In Progress */}
                  <div className="space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span> In Progress
                    </div>
                    {tasks.filter(t => t.status === 'In-Progress').map(task => (
                      <div key={task.id} className="glass-panel border-blue-500/30 p-4 rounded-lg cursor-pointer" onClick={() => updateTaskStatus(task.id, 'Done')}>
                        <h4 className="font-medium text-sm">{task.title}</h4>
                        <div className="mt-3 flex justify-between items-center">
                          <span className="text-[10px] uppercase px-2 py-0.5 rounded-sm bg-blue-500/20 text-blue-300">
                            {task.priority}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Done */}
                  <div className="space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-green-400 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span> Done
                    </div>
                    {tasks.filter(t => t.status === 'Done').map(task => (
                      <div key={task.id} className="glass-panel border-green-500/20 opacity-50 p-4 rounded-lg cursor-pointer" onClick={() => updateTaskStatus(task.id, 'Pending')}>
                        <h4 className="font-medium text-sm line-through text-zinc-400">{task.title}</h4>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Asset Vault Right Sidebar */}
              <div className="w-64 border-l border-glass-border p-6 overflow-y-auto glass-panel border-t-0 border-r-0 border-b-0">
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-4 uppercase tracking-wider text-zinc-400">
                  <LinkIcon size={14} /> Asset Vault
                </h3>
                
                <div className="space-y-3 mb-6">
                  {links.map(link => (
                    <div key={link.id} onClick={() => openUrl(link.url)} className="flex items-center gap-3 p-3 glass-panel rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                      <div className="bg-zinc-800 p-2 rounded text-zinc-300"><LinkIcon size={14} /></div>
                      <span className="text-sm font-medium truncate">{link.title}</span>
                    </div>
                  ))}
                  <button className="w-full py-2 border border-dashed border-zinc-600 rounded-lg text-sm text-zinc-400 hover:text-white hover:border-zinc-400 transition-colors">
                    + Add Link
                  </button>
                </div>

                {/* Gamification / Contribution */}
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-4 uppercase tracking-wider text-zinc-400 mt-8">
                  Activity
                </h3>
                <div className="glass-panel p-4 rounded-lg flex flex-col items-center justify-center space-y-2">
                  <div className="text-3xl font-bold text-green-400">{tasks.filter(t => t.status === 'Done').length}</div>
                  <div className="text-xs text-zinc-400 uppercase tracking-wider">Tasks Done</div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-500">
            Select or create a workspace to begin
          </div>
        )}
      </div>
    </div>
  )
}

export default App
