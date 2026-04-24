import React, { useEffect, useState, useCallback } from 'react'
import { useStore } from './store'
import { 
  Sun, Calendar, Hash, Check, 
  Clock, Play, Pause, X, Plus, 
  Zap, BarChart3, ChevronRight,
  Settings, Activity, LayoutGrid,
  CircleStop, Target, Flame
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
  // Hashtag support
  if (content.includes('#study')) return { label: 'Study', color: 'text-blue-400', bg: 'bg-blue-400/10', glow: 'shadow-[0_0_15px_rgba(96,165,250,0.3)]', hex: '#60a5fa' };
  if (content.includes('#dev') || content.includes('#code')) return { label: 'Dev', color: 'text-purple-400', bg: 'bg-purple-400/10', glow: 'shadow-[0_0_15px_rgba(192,132,252,0.3)]', hex: '#c084fc' };
  if (content.includes('#design')) return { label: 'Design', color: 'text-pink-400', bg: 'bg-pink-400/10', glow: 'shadow-[0_0_15px_rgba(244,114,182,0.3)]', hex: '#f472b6' };
  if (content.includes('#personal')) return { label: 'Personal', color: 'text-orange-400', bg: 'bg-orange-400/10', glow: 'shadow-[0_0_15px_rgba(251,146,60,0.3)]', hex: '#fb923c' };

  // Regex fallback
  if (content.match(/ucsc|nibm|bit|exam|study|assignment|semester|degree|learn|reading|class|recording|lecture/)) {
    return { label: 'Study', color: 'text-blue-400', bg: 'bg-blue-400/10', glow: 'shadow-[0_0_15px_rgba(96,165,250,0.3)]', hex: '#60a5fa' };
  }
  if (content.match(/code|fix|bug|react|css|js|electron|repo|github|dev|implementation|build|git|push/)) {
    return { label: 'Dev', color: 'text-purple-400', bg: 'bg-purple-400/10', glow: 'shadow-[0_0_15px_rgba(192,132,252,0.3)]', hex: '#c084fc' };
  }
  return { label: 'Log', color: 'text-zinc-500', bg: 'bg-zinc-500/10', glow: '', hex: '#71717a' };
};

function App() {
  const { tasks, selectedDate, fetchWorkspaces, addTask, deleteTask, toggleTimer, setSelectedDate } = useStore();
  const [newLogContent, setNewLogContent] = useState('');
  const [localDurations, setLocalDurations] = useState({});

  useEffect(() => { fetchWorkspaces(); }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        const activeTask = tasks.find(t => t.is_running);
        if (activeTask) {
          toggleTimer(activeTask.id, false);
        } else if (tasks.length > 0) {
          toggleTimer(tasks[0].id, true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tasks]);

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
  
  const targetSeconds = 8 * 3600;
  const progressPercent = Math.min((totalDailySeconds / targetSeconds) * 100, 100);

  return (
    <div className="flex h-screen w-full bg-[#0a0a0a] text-[#ededed] overflow-hidden select-none">
      {/* Sidebar */}
      <aside className="sidebar no-drag">
        <div className="p-8 draggable flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-2xl shadow-blue-600/30">
            <Zap size={24} fill="currentColor" />
          </div>
          <div>
            <span className="font-black text-xl tracking-tighter text-white uppercase italic block leading-none">Drift</span>
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Control Engine</span>
          </div>
        </div>

        <nav className="flex-1 px-3 mt-4 space-y-1">
          <div className="px-6 mb-4 text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em]">Navigation</div>
          <div className="nav-item active"><Sun size={18} /> My Daily Log</div>
          <div className="nav-item"><Calendar size={18} /> History</div>
          <div className="nav-item"><BarChart3 size={18} /> Analytics</div>
          
          <div className="mt-12 px-6 mb-4 text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em]">Smart Lists</div>
          <div className="nav-item group flex justify-between">
            <div className="flex items-center gap-3"><Hash size={18} className="text-blue-500" /> Study Session</div>
            <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100">4</span>
          </div>
          <div className="nav-item group flex justify-between">
            <div className="flex items-center gap-3"><Hash size={18} className="text-purple-500" /> Development</div>
            <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100">12</span>
          </div>
          <div className="nav-item"><Hash size={18} className="text-pink-500" /> Personal</div>
        </nav>

        {/* Sidebar Goal Widget */}
        <div className="m-6 p-6 bg-white/[0.02] border border-white/5 rounded-[24px] space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Today's Focus</span>
            <Flame size={14} className="text-orange-500" />
          </div>
          <div className="text-2xl font-mono font-bold text-white tracking-tighter">
            {formatDuration(totalDailySeconds)}
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              className="h-full bg-gradient-to-r from-blue-600 to-blue-400"
            />
          </div>
        </div>

        <div className="p-6 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-600 hover:text-white transition-colors cursor-pointer">
              <Settings size={16} />
            </div>
          </div>
          <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">v1.0.4 Premium</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col no-drag relative bg-gradient-to-b from-[#0a0a0a] to-[#0d0d0d]">
        <header className="h-20 flex items-center justify-between px-10 draggable border-b border-white/5 z-50">
          <div className="flex items-center gap-4 no-drag">
             <div className="flex items-center gap-3">
               <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
               <h1 className="text-lg font-black text-white uppercase tracking-tight">Active Engine</h1>
             </div>
             <ChevronRight size={16} className="text-zinc-800" />
             <span className="text-zinc-500 text-sm font-bold">{new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</span>
          </div>
          
          <div className="flex items-center gap-8 no-drag">
             <WindowControls />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-12 py-10 pb-44 scrollbar-hide">
          <div className="max-w-5xl mx-auto">
            {/* HERO CARD - Active Session */}
            <AnimatePresence mode="wait">
              {runningTask ? (
                <motion.div 
                  key="hero-active"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="relative p-12 mb-16 rounded-[40px] bg-[#121212] border border-white/10 shadow-2xl overflow-hidden group"
                >
                  {/* Decorative Background Elements */}
                  <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full" />
                  <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-600/5 blur-[80px] rounded-full" />
                  
                  <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="text-[11px] font-black text-blue-500 uppercase tracking-[0.4em] mb-6 flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" /> Currently Processing
                    </div>
                    
                    <h2 className="text-5xl font-black text-white tracking-tighter mb-8 max-w-2xl leading-tight">
                      {runningTask.title}
                    </h2>

                    <div className="text-7xl font-mono font-black text-white tracking-[-0.05em] mb-12 tabular-nums">
                      {formatDuration(localDurations[runningTask.id] || runningTask.duration)}
                    </div>

                    <div className="flex items-center gap-6">
                      <button 
                        onClick={() => toggleTimer(runningTask.id, false)}
                        className="h-20 w-20 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-all shadow-xl shadow-white/10 active:scale-95"
                      >
                        <Pause size={32} fill="currentColor" />
                      </button>
                      <button 
                        onClick={() => toggleTimer(runningTask.id, false)} // Just pause for now as stop
                        className="h-16 w-16 rounded-full bg-zinc-900 border border-white/10 text-zinc-400 flex items-center justify-center hover:text-white hover:border-white/30 transition-all active:scale-95"
                      >
                        <CircleStop size={28} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                /* Hero - Empty State with Circular Progress */
                <motion.div 
                  key="hero-empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-24 mb-8 text-center"
                >
                  <div className="relative w-48 h-48 mb-10">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle 
                        cx="96" cy="96" r="88" 
                        className="stroke-zinc-900" 
                        strokeWidth="12" fill="transparent" 
                      />
                      <motion.circle 
                        cx="96" cy="96" r="88" 
                        className="stroke-blue-600" 
                        strokeWidth="12" fill="transparent"
                        strokeDasharray={552.92}
                        initial={{ strokeDashoffset: 552.92 }}
                        animate={{ strokeDashoffset: 552.92 - (552.92 * progressPercent / 100) }}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-black text-white">{Math.round(progressPercent)}%</span>
                      <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Focus</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Engine Ready for Input</h3>
                  <p className="text-zinc-500 text-sm font-medium max-w-xs">Logging active. Enter an achievement below to begin focus tracking.</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Activities Stream */}
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em]">Activity Stream</h3>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Connected</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {tasks.filter(t => !t.is_running || !runningTask).map((log, index) => {
                  const info = getCategoryInfo(log.title);
                  const displayDuration = localDurations[log.id] || log.duration || 0;
                  
                  return (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      key={log.id} 
                      className={`log-card group flex justify-between items-center hover:scale-[1.01] ${info.glow}`}
                    >
                      <div className="flex items-center gap-6">
                        <div className={`w-12 h-12 rounded-2xl ${info.bg} ${info.color} flex items-center justify-center border border-white/5 transition-transform group-hover:rotate-12`}>
                          <Check size={24} />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1.5">
                            <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-md ${info.bg} ${info.color}`}>
                              {info.label}
                            </span>
                            {displayDuration > 0 && (
                              <span className="text-xs font-mono font-bold text-zinc-500 flex items-center gap-2">
                                <Clock size={14} className={info.color} /> {formatDuration(displayDuration)}
                              </span>
                            )}
                          </div>
                          <p className="text-lg text-zinc-200 font-bold tracking-tight group-hover:text-white transition-colors">{log.title}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => toggleTimer(log.id, !log.is_running)}
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center ${info.color} hover:bg-white/5 transition-all active:scale-90`}
                        >
                          <Play size={24} fill="currentColor" />
                        </button>
                        <button onClick={() => deleteTask(log.id)} className="w-12 h-12 rounded-2xl flex items-center justify-center text-zinc-800 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all">
                          <X size={24} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Floating Input Area */}
        <div className="absolute bottom-0 left-0 right-0 p-12 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent z-50">
          <div className="max-w-4xl mx-auto">
            <form 
              onSubmit={handleAddLog}
              className="input-container no-drag group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center transition-all group-focus-within:bg-blue-600 group-focus-within:text-white">
                <Plus size={24} className={newLogContent ? 'text-white' : 'text-blue-500'} />
              </div>
              <input 
                type="text" 
                placeholder="Log activity... use #hashtags (e.g. Started #dev on Drift)" 
                value={newLogContent}
                onChange={(e) => setNewLogContent(e.target.value)}
                className="bg-transparent flex-1 text-xl font-bold outline-none placeholder:text-zinc-800 text-white" 
              />
              <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-white/5 rounded-xl border border-white/5 text-[9px] font-black text-zinc-500 tracking-[0.2em] uppercase">
                <Target size={12} className="text-blue-500" /> PRO ENGINE
              </div>
            </form>
            <div className="mt-4 flex justify-center gap-6">
               <div className="text-[9px] font-black text-zinc-700 uppercase tracking-widest flex items-center gap-2">
                 <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-white/5 rounded text-zinc-500">SPACE</kbd> PAUSE / RESUME
               </div>
               <div className="text-[9px] font-black text-zinc-700 uppercase tracking-widest flex items-center gap-2">
                 <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-white/5 rounded text-zinc-500">ENTER</kbd> QUICK LOG
               </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
