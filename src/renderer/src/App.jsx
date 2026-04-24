import React, { useEffect, useState } from 'react'
import { useStore } from './store'
import { 
  Sun, Calendar, User, Hash, Check, 
  Clock, Play, Pause, X, Plus, Search, 
  Layout, Zap, BarChart3, ChevronRight,
  MoreVertical, Settings, Activity
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

function WindowControls() {
  return (
    <div className="flex items-center no-drag h-10 pr-2">
      <button onClick={() => window.api?.minimize()} className="w-10 h-10 flex items-center justify-center hover:bg-white/5 transition-colors group">
        <div className="w-3 h-[1.5px] bg-zinc-600 group-hover:bg-zinc-300" />
      </button>
      <button onClick={() => window.api?.maximize()} className="w-10 h-10 flex items-center justify-center hover:bg-white/5 transition-colors group">
        <div className="w-3 h-3 border border-zinc-600 group-hover:bg-zinc-300 rounded-[1px]" />
      </button>
      <button onClick={() => window.api?.close()} className="w-10 h-10 flex items-center justify-center hover:bg-red-500/90 transition-colors group">
        <X size={14} className="text-zinc-600 group-hover:text-white" />
      </button>
    </div>
  );
}

const formatDuration = (totalSeconds) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const getCategoryInfo = (text) => {
  const content = text.toLowerCase();
  if (content.match(/ucsc|nibm|bit|exam|study|assignment|semester|degree|learn|reading|class|recording|lecture/)) {
    return { label: 'Study', color: 'text-blue-400', bg: 'bg-blue-400/10' };
  }
  if (content.match(/code|fix|bug|react|css|js|electron|repo|github|dev|implementation|build|git|push/)) {
    return { label: 'Dev', color: 'text-emerald-400', bg: 'bg-emerald-400/10' };
  }
  return { label: 'Log', color: 'text-zinc-500', bg: 'bg-zinc-500/10' };
};

function App() {
  const { tasks, selectedDate, fetchWorkspaces, addTask, deleteTask, toggleTimer, setSelectedDate } = useStore();
  const [newLogContent, setNewLogContent] = useState('');
  const [localDurations, setLocalDurations] = useState({});

  useEffect(() => { fetchWorkspaces(); }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const updates = {};
      tasks.forEach(task => {
        if (task.is_running && task.last_started_at) {
          const startTime = new Date(task.last_started_at).getTime();
          const elapsed = Math.floor((new Date().getTime() - startTime) / 1000);
          updates[task.id] = (task.duration || 0) + elapsed;
        }
      });
      if (Object.keys(updates).length > 0) setLocalDurations(prev => ({ ...prev, ...updates }));
    }, 1000);
    return () => clearInterval(interval);
  }, [tasks]);

  const handleAddLog = async (e) => {
    e.preventDefault();
    if (newLogContent.trim()) {
      await addTask(newLogContent.trim());
      setNewLogContent('');
    }
  };

  const totalDailySeconds = tasks.reduce((acc, t) => acc + (localDurations[t.id] || t.duration || 0), 0);
  const runningTask = tasks.find(t => t.is_running);
  
  // Daily Target Calculation (8 hours)
  const targetSeconds = 8 * 3600;
  const progressPercent = Math.min((totalDailySeconds / targetSeconds) * 100, 100);

  return (
    <div className="flex h-screen w-full bg-[#141414] text-[#ededed] overflow-hidden select-none">
      {/* Premium Sidebar */}
      <aside className="sidebar no-drag">
        {/* Profile / Header */}
        <div className="p-6 draggable flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
            <Zap size={18} fill="currentColor" />
          </div>
          <span className="font-bold text-sm tracking-tight text-white uppercase italic">Drift Control</span>
        </div>

        {/* Primary Nav */}
        <nav className="flex-1 mt-2">
          <div className="px-4 mb-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Main</div>
          <div className="nav-item active"><Sun size={16} /> Daily Log</div>
          <div className="nav-item"><Calendar size={16} /> Work History</div>
          <div className="nav-item"><BarChart3 size={16} /> Performance</div>
          
          <div className="mt-8 px-4 mb-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Collections</div>
          <div className="nav-item"><Hash size={16} /> Study Sessions</div>
          <div className="nav-item"><Hash size={16} /> Development</div>
          <div className="nav-item"><Hash size={16} /> Design Ops</div>
        </nav>

        {/* Daily Goal Progress - Integrated Widget */}
        <div className="m-4 p-5 bg-black/30 border border-white/5 rounded-2xl space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Daily Target</div>
              <div className="text-xl font-mono font-bold text-white tracking-tighter">
                {formatDuration(totalDailySeconds)}
              </div>
            </div>
            <span className="text-xs font-bold text-blue-500">{Math.round(progressPercent)}%</span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              className="h-full bg-blue-500"
            />
          </div>
          <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-medium">
            <Activity size={12} className="text-emerald-500" />
            <span>Target: 08:00:00</span>
          </div>
        </div>

        <div className="p-4 flex items-center justify-between border-t border-white/5">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10 group-hover:border-zinc-500 transition-colors">
              <User size={14} className="text-zinc-500" />
            </div>
            <span className="text-xs font-bold text-zinc-400 group-hover:text-zinc-200">Zallky Neo</span>
          </div>
          <Settings size={16} className="text-zinc-600 hover:text-zinc-300 cursor-pointer transition-colors" />
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col no-drag relative">
        <header className="h-16 flex items-center justify-between px-8 draggable border-b border-white/5 bg-[#141414]/80 backdrop-blur-md z-50">
          <div className="flex items-center gap-4 no-drag">
            <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold">
              <span>Logs</span>
              <ChevronRight size={14} />
              <span className="text-zinc-200">{new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5 no-drag hover:border-white/10 transition-colors">
                <Calendar size={14} className="text-zinc-500" />
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent border-none text-[11px] font-bold text-zinc-300 outline-none cursor-pointer"
                />
             </div>
             <WindowControls />
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-10 py-10 pb-36 scrollbar-hide">
          <div className="max-w-4xl mx-auto space-y-10">
            {/* Active Session High-Fidelity Monitor */}
            <AnimatePresence mode="popLayout">
              {runningTask && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="log-card active p-8 flex justify-between items-center relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                  <div className="flex items-center gap-8">
                    <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-600/30">
                      <Pause size={28} fill="currentColor" onClick={() => toggleTimer(runningTask.id, false)} className="cursor-pointer active:scale-90 transition-all" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1 animate-pulse-soft flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Live Processing Session
                      </div>
                      <h2 className="text-3xl font-bold text-white tracking-tight">{runningTask.title}</h2>
                      <div className="text-lg font-mono font-bold text-zinc-400 mt-2 flex items-center gap-2">
                        <Clock size={16} /> {formatDuration(localDurations[runningTask.id] || runningTask.duration)}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                   Daily Achievements
                </h3>
                {tasks.filter(t => !t.is_running || !runningTask).map(log => {
                  const info = getCategoryInfo(log.title);
                  const displayDuration = localDurations[log.id] || log.duration || 0;
                  
                  return (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={log.id} 
                      className="log-card group flex justify-between items-center"
                    >
                      <div className="flex items-center gap-5">
                        <div className={`w-9 h-9 rounded-lg ${info.bg} ${info.color} flex items-center justify-center border border-white/5`}>
                          <Check size={18} />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-0.5">
                            <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${info.bg} ${info.color}`}>
                              {info.label}
                            </span>
                            {displayDuration > 0 && (
                              <span className="text-[11px] font-mono font-bold text-zinc-500 flex items-center gap-1.5">
                                <Clock size={12} /> {formatDuration(displayDuration)}
                              </span>
                            )}
                          </div>
                          <p className="text-[16px] text-zinc-200 font-semibold tracking-tight leading-snug">{log.title}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => toggleTimer(log.id, !log.is_running)}
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/5 transition-all"
                        >
                          <Play size={20} fill="currentColor" />
                        </button>
                        <button onClick={() => deleteTask(log.id)} className="w-10 h-10 rounded-lg flex items-center justify-center text-zinc-800 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all">
                          <X size={20} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </AnimatePresence>

            {tasks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-32 text-center opacity-30">
                <div className="w-20 h-20 rounded-3xl border-2 border-dashed border-zinc-700 flex items-center justify-center mb-6">
                  <Activity size={32} className="text-zinc-600" />
                </div>
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em]">System Initialized</h3>
                <p className="text-zinc-600 mt-2 text-[11px]">Awaiting daily achievement input...</p>
              </div>
            )}
          </div>
        </div>

        {/* Industrial Input Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-[#141414] via-[#141414] to-transparent z-50">
          <div className="max-w-4xl mx-auto">
            <form 
              onSubmit={handleAddLog}
              className="input-container no-drag"
            >
              <Plus size={20} className="text-blue-500" />
              <input 
                type="text" 
                placeholder="Type achievement and press Enter... (e.g. Completed Semester 4 EAD Recording)" 
                value={newLogContent}
                onChange={(e) => setNewLogContent(e.target.value)}
                className="bg-transparent flex-1 text-sm font-medium outline-none placeholder:text-zinc-700" 
              />
              <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-md border border-white/5 text-[10px] font-bold text-zinc-500">
                <Zap size={10} className="text-blue-500" />
                AI CLASSIFICATION
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
