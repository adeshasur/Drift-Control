import React, { useEffect, useState, useRef } from 'react'
import { useStore } from './store'
import { Folder, Code, Plus, Search, CheckCircle, Clock, AlertCircle, Link as LinkIcon, Play, Pause, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

function WindowControls() {
  return (
    <div className="absolute top-0 right-0 flex items-center no-drag z-[100] h-10">
      <div 
        onClick={() => window.api?.minimize()} 
        className="w-12 h-full flex items-center justify-center hover:bg-white/10 cursor-pointer transition-colors"
        title="Minimize"
      >
        <div className="w-3 h-[1px] bg-white" />
      </div>
      <div 
        onClick={() => window.api?.maximize()} 
        className="w-12 h-full flex items-center justify-center hover:bg-white/10 cursor-pointer transition-colors"
        title="Maximize"
      >
        <div className="w-3 h-3 border border-white" />
      </div>
      <div 
        onClick={() => window.api?.close()} 
        className="w-12 h-full flex items-center justify-center hover:bg-red-500 cursor-pointer transition-colors group"
        title="Close"
      >
        <X size={16} className="text-white opacity-70 group-hover:opacity-100" />
      </div>
    </div>
  );
}

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

const formatDuration = (totalSeconds) => {
  if (!totalSeconds) return '00:00:00';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const getCategoryInfo = (text) => {
  const content = text.toLowerCase();
  
  if (content.match(/ucsc|nibm|bit|exam|study|assignment|semester|degree|learn|reading|class|recording|lecture/)) {
    return { label: 'Education', icon: <Clock size={14} />, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' };
  }
  if (content.match(/code|fix|bug|react|css|js|electron|repo|github|dev|implementation|build|git|push/)) {
    return { label: 'Development', icon: <Code size={14} />, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' };
  }
  if (content.match(/figma|ui|ux|logo|color|layout|design|aesthetic|mockup/)) {
    return { label: 'Design', icon: <Search size={14} />, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' };
  }
  if (content.match(/gym|health|food|sleep|travel|personal|workout|meditate|run/)) {
    return { label: 'Personal', icon: <Plus size={14} />, color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20' };
  }
  
  return { label: 'Activity', icon: <AlertCircle size={14} />, color: 'text-zinc-400', bg: 'bg-zinc-400/10', border: 'border-zinc-400/20' };
};

function App() {
  const { 
    tasks, selectedDate,
    fetchWorkspaces, addTask, deleteTask, toggleTimer, setSelectedDate
  } = useStore();

  const [isAddingLog, setIsAddingLog] = useState(false);
  const [newLogContent, setNewLogContent] = useState('');
  const [localDurations, setLocalDurations] = useState({});
  
  useEffect(() => {
    fetchWorkspaces();
  }, []);

  // Update local durations for running timers
  useEffect(() => {
    const interval = setInterval(() => {
      const updates = {};
      tasks.forEach(task => {
        if (task.is_running && task.last_started_at) {
          const startTime = new Date(task.last_started_at).getTime();
          const now = new Date().getTime();
          const elapsed = Math.floor((now - startTime) / 1000);
          updates[task.id] = (task.duration || 0) + elapsed;
        }
      });
      if (Object.keys(updates).length > 0) {
        setLocalDurations(prev => ({ ...prev, ...updates }));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [tasks]);

  const handleAddLog = async (e) => {
    if (e.key === 'Enter' && newLogContent.trim()) {
      await addTask(newLogContent.trim());
      setNewLogContent('');
      setIsAddingLog(false);
    }
  };

  // Handle routing for deep work
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

  const totalDailySeconds = tasks.reduce((acc, task) => {
    const current = localDurations[task.id] || task.duration || 0;
    return acc + current;
  }, 0);

  return (
    <div className="flex h-screen w-full font-sans draggable overflow-hidden bg-zinc-950 text-white">
      <WindowControls />
      
      {/* Main Content Area - Full Width Layout */}
      <div className="flex-1 flex flex-col no-drag overflow-hidden w-full bg-zinc-900/30 shadow-2xl">
        {/* Header */}
        <div className="h-56 border-b border-glass-border flex flex-col justify-end px-20 pb-12 bg-gradient-to-b from-transparent to-black/30">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-sm font-black tracking-[0.4em] text-zinc-600 uppercase mb-4">System.Drift</h1>
              <h2 className="text-6xl font-black tracking-tighter">Daily Log</h2>
            </div>
            
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-4 bg-white/5 px-8 py-4 rounded-3xl border border-white/10 hover:border-white/20 transition-all cursor-pointer group shadow-inner">
                <Clock size={22} className="text-blue-400 group-hover:scale-110 transition-transform" />
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent border-none text-lg font-mono font-bold text-zinc-200 outline-none cursor-pointer"
                />
              </div>
              <button 
                onClick={() => setIsAddingLog(true)} 
                className="w-16 h-16 bg-white text-black rounded-3xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-white/20"
              >
                <Plus size={32} strokeWidth={4} />
              </button>
            </div>
          </div>
        </div>

        {/* Logs Area */}
        <div className="flex-1 overflow-y-auto px-20 py-16 scrollbar-hide">
          <div className="space-y-10">
            <AnimatePresence mode="popLayout">
              {isAddingLog && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="glass-panel p-10 rounded-[3rem] border-white/10 shadow-2xl bg-white/[0.03]"
                >
                  <input
                    autoFocus
                    type="text"
                    placeholder="Describe your achievement..."
                    value={newLogContent}
                    onChange={(e) => setNewLogContent(e.target.value)}
                    onKeyDown={handleAddLog}
                    onBlur={() => !newLogContent && setIsAddingLog(false)}
                    className="w-full bg-transparent text-3xl outline-none font-bold placeholder:text-zinc-800 tracking-tight"
                  />
                  <div className="mt-8 flex items-center gap-4">
                    <span className="flex h-3 w-3 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                    </span>
                    <span className="text-xs text-zinc-600 font-black uppercase tracking-[0.3em]">Processing intelligence...</span>
                  </div>
                </motion.div>
              )}

              {tasks.length > 0 ? tasks.map(log => {
                const info = getCategoryInfo(log.title);
                const displayDuration = localDurations[log.id] || log.duration || 0;
                
                return (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    key={log.id} 
                    className={`glass-panel p-10 rounded-[3rem] group transition-all flex justify-between items-center border-white/5 shadow-xl ${log.is_running ? 'border-blue-500/30 bg-blue-500/[0.03]' : 'hover:bg-white/[0.05]'}`}
                  >
                    <div className="flex items-center gap-10">
                      <div className={`w-20 h-20 rounded-3xl ${info.bg} ${info.color} flex items-center justify-center border ${info.border} shadow-inner`}>
                        {React.cloneElement(info.icon, { size: 28 })}
                      </div>
                      <div>
                        <div className="flex items-center gap-4 mb-3">
                          <span className={`text-xs font-black uppercase tracking-[0.3em] px-3 py-1 rounded-lg ${info.bg} ${info.color}`}>
                            {info.label}
                          </span>
                          {displayDuration > 0 && (
                            <span className="text-sm font-mono font-bold text-zinc-500 flex items-center gap-2">
                              <Clock size={12} /> {formatDuration(displayDuration)}
                            </span>
                          )}
                        </div>
                        <p className="text-4xl text-zinc-100 font-black tracking-tighter leading-tight">{log.title}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => toggleTimer(log.id, !log.is_running)}
                        className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-all ${log.is_running ? 'bg-orange-500 text-white' : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'}`}
                        title={log.is_running ? "Pause Timer" : "Start Timer"}
                      >
                        {log.is_running ? <Pause size={32} /> : <Play size={32} />}
                      </button>
                      <button onClick={() => deleteTask(log.id)} className="w-16 h-16 rounded-3xl flex items-center justify-center text-zinc-800 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all">
                        <X size={32} />
                      </button>
                    </div>
                  </motion.div>
                );
              }) : !isAddingLog && (
                <div className="flex flex-col items-center justify-center py-56">
                  <div className="w-32 h-32 rounded-[3rem] border-4 border-dashed border-zinc-800 flex items-center justify-center mb-10">
                    <Folder size={48} className="text-zinc-800" />
                  </div>
                  <p className="text-3xl font-black text-zinc-800 uppercase tracking-[0.4em]">Zero Drift</p>
                  <p className="text-zinc-700 mt-4 text-lg font-medium italic">The canvas is empty. Record your first win.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer Stats */}
        <div className="p-14 border-t border-white/5 bg-black/40 backdrop-blur-2xl">
          <div className="flex justify-between items-center">
            <div className="flex gap-24">
              <div>
                <div className="text-5xl font-black tracking-tighter">{tasks.length}</div>
                <div className="text-xs font-black text-zinc-600 uppercase tracking-[0.3em]">Total Achievements</div>
              </div>
              <div>
                <div className="text-5xl font-black tracking-tighter text-blue-400">
                  {formatDuration(totalDailySeconds)}
                </div>
                <div className="text-xs font-black text-zinc-600 uppercase tracking-[0.3em]">Active Focus Time</div>
              </div>
              <div className="hidden lg:block">
                <div className="text-5xl font-black tracking-tighter text-emerald-400">
                  {tasks.filter(t => getCategoryInfo(t.title).label === 'Development').length}
                </div>
                <div className="text-xs font-black text-zinc-600 uppercase tracking-[0.3em]">Dev Projects</div>
              </div>
            </div>
            <div className="text-xs font-black text-zinc-700 uppercase tracking-[0.4em] flex items-center gap-4">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
              Neural Network Active
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
