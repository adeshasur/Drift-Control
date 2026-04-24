import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useStore } from './store'
import { 
  Sun, Calendar, Hash, Check, 
  Clock, Play, Pause, X, Plus, 
  Zap, BarChart3, ChevronRight,
  Settings, Activity, LayoutGrid,
  CircleStop, Target, Flame, Trophy,
  TrendingUp, Sparkles
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

function WindowControls() {
  return (
    <div className="flex items-center no-drag h-10 pr-2">
      <button onClick={() => window.api?.minimize()} className="w-10 h-10 flex items-center justify-center hover:bg-white/5 transition-colors group">
        <div className="w-3 h-[1.5px] bg-zinc-700 group-hover:bg-zinc-300" />
      </button>
      <button onClick={() => window.api?.maximize()} className="w-10 h-10 flex items-center justify-center hover:bg-white/5 transition-colors group">
        <div className="w-3 h-3 border border-zinc-700 group-hover:bg-zinc-300 rounded-[1px]" />
      </button>
      <button onClick={() => window.api?.close()} className="w-10 h-10 flex items-center justify-center hover:bg-red-500/90 transition-colors group">
        <X size={14} className="text-zinc-700 group-hover:text-white" />
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
  if (content.includes('#study')) return { label: 'Study', color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/50', hex: '#3b82f6' };
  if (content.includes('#dev') || content.includes('#code')) return { label: 'Dev', color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/50', hex: '#a855f7' };
  if (content.includes('#design')) return { label: 'Design', color: 'text-pink-500', bg: 'bg-pink-500/10', border: 'border-pink-500/50', hex: '#ec4899' };
  if (content.includes('#personal')) return { label: 'Personal', color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/50', hex: '#f97316' };

  if (content.match(/ucsc|nibm|bit|exam|study|assignment|semester|degree|learn|reading|class|recording|lecture/)) {
    return { label: 'Study', color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/50', hex: '#3b82f6' };
  }
  if (content.match(/code|fix|bug|react|css|js|electron|repo|github|dev|implementation|build|git|push/)) {
    return { label: 'Dev', color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/50', hex: '#a855f7' };
  }
  return { label: 'Log', color: 'text-zinc-500', bg: 'bg-zinc-500/10', border: 'border-zinc-500/30', hex: '#71717a' };
};

function App() {
  const { tasks, selectedDate, fetchWorkspaces, addTask, deleteTask, toggleTimer, setSelectedDate } = useStore();
  const [newLogContent, setNewLogContent] = useState('');
  const [localDurations, setLocalDurations] = useState({});
  const [activeCategory, setActiveCategory] = useState(null);

  useEffect(() => { fetchWorkspaces(); }, []);

  // Sync active category border color
  useEffect(() => {
    const info = getCategoryInfo(newLogContent);
    setActiveCategory(info.label !== 'Log' ? info : null);
  }, [newLogContent]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        const activeTask = tasks.find(t => t.is_running);
        if (activeTask) toggleTimer(activeTask.id, false);
        else if (tasks.length > 0) toggleTimer(tasks[0].id, true);
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

  // Find most frequent category
  const categories = tasks.map(t => getCategoryInfo(t.title).label);
  const topCategory = categories.sort((a, b) => categories.filter(v => v === a).length - categories.filter(v => v === b).length).pop() || 'None';

  return (
    <div className="flex h-screen w-full bg-[#050505] text-[#ededed] overflow-hidden select-none font-sans">
      {/* Sidebar */}
      <aside className="sidebar no-drag">
        <div className="p-10 draggable flex items-center gap-4">
          <div className="w-12 h-12 rounded-[18px] bg-blue-600 flex items-center justify-center text-white shadow-2xl shadow-blue-600/40">
            <Zap size={26} fill="currentColor" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-2xl tracking-tighter text-white uppercase italic leading-none">Drift</span>
            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] mt-1">Core Engine</span>
          </div>
        </div>

        <nav className="flex-1 px-3 mt-6 space-y-1.5">
          <div className="px-7 mb-4 text-[10px] font-black text-zinc-800 uppercase tracking-[0.4em]">Control Center</div>
          <div className="nav-item active"><Sun size={18} /> Daily Log</div>
          <div className="nav-item"><Calendar size={18} /> History</div>
          <div className="nav-item"><BarChart3 size={18} /> Analytics</div>
          
          <div className="mt-12 px-7 mb-4 text-[10px] font-black text-zinc-800 uppercase tracking-[0.4em]">Clusters</div>
          <div className="nav-item group flex justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
              <span className="group-hover:translate-x-1 transition-transform">Study Ops</span>
            </div>
          </div>
          <div className="nav-item group flex justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_#a855f7]" />
              <span className="group-hover:translate-x-1 transition-transform">Development</span>
            </div>
          </div>
          <div className="nav-item group flex justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_8px_#ec4899]" />
              <span className="group-hover:translate-x-1 transition-transform">Design Lab</span>
            </div>
          </div>
        </nav>

        {/* Sidebar Goal Widget */}
        <div className="m-6 p-7 bg-white/[0.01] border border-white/5 rounded-[32px] space-y-5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Efficiency</span>
            <TrendingUp size={14} className="text-emerald-500" />
          </div>
          <div className="text-3xl font-mono font-bold text-white tracking-tighter">
            {formatDuration(totalDailySeconds)}
          </div>
          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-500"
            />
          </div>
        </div>

        <div className="p-8 border-t border-white/5 flex items-center justify-between">
          <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-white/5 flex items-center justify-center text-zinc-700 hover:text-zinc-300 transition-colors cursor-pointer">
            <Settings size={20} />
          </div>
          <span className="text-[9px] font-black text-zinc-800 uppercase tracking-[0.2em]">Build 2.0.1</span>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col no-drag relative">
        <header className="h-24 flex items-center justify-between px-12 draggable border-b border-white/5 glass z-50">
          <div className="flex items-center gap-6 no-drag">
             <div className="flex items-center gap-4">
               <Sparkles size={20} className="text-blue-500" />
               <h1 className="text-xl font-black text-white uppercase tracking-tight">Mainframe</h1>
             </div>
             <div className="h-6 w-px bg-zinc-900" />
             <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/5">
                <Calendar size={14} className="text-zinc-600" />
                <span className="text-zinc-400 text-xs font-black uppercase tracking-widest">{new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
             </div>
          </div>
          
          <div className="flex items-center gap-12 no-drag">
             {/* Quick Stats Top Right */}
             <div className="hidden xl:flex items-center gap-8">
               <div className="flex flex-col items-end">
                 <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Top Focus</span>
                 <span className="text-xs font-bold text-blue-500 uppercase">{topCategory}</span>
               </div>
               <div className="flex flex-col items-end">
                 <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Streak</span>
                 <span className="text-xs font-bold text-emerald-500 uppercase">12 DAYS</span>
               </div>
             </div>
             <WindowControls />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-16 py-12 pb-56 relative">
          <div className="max-w-5xl mx-auto relative">
            
            {/* CENTRAL FOCUS RING ENGINE */}
            <div className="flex flex-col items-center justify-center py-20 mb-20 relative">
              <div className={`relative w-64 h-64 flex items-center justify-center rounded-full transition-all duration-1000 ${runningTask ? 'active-glow border-blue-500/20' : 'border-zinc-900'}`}>
                
                {/* Orbiting Elements */}
                {runningTask && (
                  <>
                    <div className="orbit-stats" style={{ animationDuration: '15s' }}>
                      <div className="bg-blue-600/20 border border-blue-500/30 px-2 py-1 rounded-full text-[8px] font-black text-blue-500 uppercase tracking-widest">Target 08:00</div>
                    </div>
                    <div className="orbit-stats" style={{ animationDuration: '25s', animationDelay: '-5s' }}>
                      <div className="bg-emerald-600/20 border border-emerald-500/30 px-2 py-1 rounded-full text-[8px] font-black text-emerald-500 uppercase tracking-widest">Active Focus</div>
                    </div>
                  </>
                )}

                <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                  <circle cx="128" cy="128" r="110" className="stroke-zinc-950" strokeWidth="12" fill="transparent" />
                  <motion.circle 
                    cx="128" cy="128" r="110" 
                    className="stroke-blue-600 shadow-2xl" 
                    strokeWidth="12" fill="transparent"
                    strokeDasharray={691.15}
                    initial={{ strokeDashoffset: 691.15 }}
                    animate={{ strokeDashoffset: 691.15 - (691.15 * progressPercent / 100) }}
                    strokeLinecap="round"
                  />
                </svg>

                <div className="flex flex-col items-center justify-center z-10">
                  <AnimatePresence mode="wait">
                    {runningTask ? (
                      <motion.div 
                        key="timer" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center"
                      >
                        <span className="text-4xl font-mono font-black text-white tracking-tighter tabular-nums leading-none">
                          {formatDuration(localDurations[runningTask.id] || runningTask.duration)}
                        </span>
                        <div className="mt-6 flex items-center gap-4">
                           <button onClick={() => toggleTimer(runningTask.id, false)} className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center hover:scale-110 transition-transform shadow-xl shadow-white/10 active:scale-95">
                              <Pause size={24} fill="currentColor" />
                           </button>
                           <button onClick={() => toggleTimer(runningTask.id, false)} className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/5 text-zinc-500 flex items-center justify-center hover:text-white transition-colors">
                              <CircleStop size={20} />
                           </button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div key="percent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
                        <span className="text-5xl font-black text-white tracking-tighter leading-none">{Math.round(progressPercent)}%</span>
                        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mt-3">Completed</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              
              {/* Timeline Connection Line */}
              <div className="h-20 w-px bg-gradient-to-b from-blue-600/50 to-zinc-900" />
            </div>

            {/* VERTICAL TIMELINE STREAM */}
            <div className="relative pl-12 space-y-8">
              <div className="timeline-line" />
              
              <AnimatePresence mode="popLayout">
                {tasks.map((log, index) => {
                  const info = getCategoryInfo(log.title);
                  const displayDuration = localDurations[log.id] || log.duration || 0;
                  
                  return (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, x: -20, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                      key={log.id} 
                      className="relative group"
                    >
                      <div className="timeline-node group-hover:border-blue-500 group-hover:scale-125 transition-all" />
                      
                      <div className={`log-card flex justify-between items-center ${log.is_running ? 'border-blue-500/30 bg-blue-500/[0.02]' : ''}`}>
                        <div className="flex items-center gap-8">
                          <div className={`w-14 h-14 rounded-2xl ${info.bg} ${info.color} flex items-center justify-center border border-white/5 shadow-inner group-hover:rotate-6 transition-transform`}>
                            {log.is_running ? <Play size={24} className="animate-pulse" fill="currentColor" /> : <Check size={24} />}
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-md ${info.bg} ${info.color} border border-white/5`}>
                                {info.label}
                              </span>
                              {displayDuration > 0 && (
                                <span className="text-xs font-mono font-bold text-zinc-500 flex items-center gap-2">
                                  <Clock size={14} className={info.color} /> {formatDuration(displayDuration)}
                                </span>
                              )}
                            </div>
                            <p className="text-xl text-zinc-100 font-bold tracking-tight leading-tight">{log.title}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 no-drag">
                          {!log.is_running && (
                            <button 
                              onClick={() => toggleTimer(log.id, true)}
                              className={`w-14 h-14 rounded-2xl flex items-center justify-center ${info.color} hover:bg-white/5 transition-all active:scale-90`}
                            >
                              <Play size={26} fill="currentColor" />
                            </button>
                          )}
                          <button onClick={() => deleteTask(log.id)} className="w-12 h-12 rounded-2xl flex items-center justify-center text-zinc-900 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all">
                            <X size={24} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {tasks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center opacity-30">
                  <LayoutGrid size={40} className="text-zinc-800 mb-6" />
                  <h3 className="text-sm font-black text-zinc-700 uppercase tracking-[0.3em]">Timeline Static</h3>
                  <p className="text-zinc-800 mt-2 text-xs font-bold uppercase">Initialize log to enable stream</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Floating Smart Input */}
        <div className="absolute bottom-0 left-0 right-0 p-12 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent z-50">
          <div className="max-w-4xl mx-auto">
            <form 
              onSubmit={handleAddLog}
              className={`input-container no-drag group ${activeCategory ? `border-${activeCategory.color.split('-')[1]}-500/50 shadow-[0_0_20px_rgba(var(--${activeCategory.color.split('-')[1]}-rgb),0.2)]` : ''}`}
              style={activeCategory ? { borderColor: activeCategory.hex + '80', boxShadow: `0 20px 50px ${activeCategory.hex}20` } : {}}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${activeCategory ? 'bg-zinc-100 text-black' : 'bg-blue-600/10 text-blue-500'}`}>
                <Plus size={26} strokeWidth={3} />
              </div>
              <div className="flex-1 relative">
                <input 
                  type="text" 
                  placeholder="Capture achievement... e.g. #dev Initialized UI Stream" 
                  value={newLogContent}
                  onChange={(e) => setNewLogContent(e.target.value)}
                  className="bg-transparent w-full text-xl font-bold outline-none placeholder:text-zinc-800 text-white" 
                />
                {/* Simulated Hashtag Suggestion */}
                {newLogContent.endsWith('#') && (
                  <div className="absolute bottom-full mb-4 left-0 bg-[#0f0f0f] border border-white/10 rounded-xl p-2 shadow-2xl flex gap-2">
                    {['study', 'dev', 'design', 'personal'].map(tag => (
                      <div key={tag} className="px-3 py-1 bg-white/5 rounded-lg text-[10px] font-black text-zinc-400 uppercase tracking-widest cursor-pointer hover:bg-blue-600 hover:text-white transition-all">#{tag}</div>
                    ))}
                  </div>
                )}
              </div>
              <div className="hidden lg:flex items-center gap-4 px-5 py-2.5 bg-white/5 rounded-2xl border border-white/5 text-[10px] font-black text-zinc-600 tracking-[0.2em] uppercase">
                <Sparkles size={14} className={activeCategory ? activeCategory.color : 'text-blue-500'} /> DRIFT v2
              </div>
            </form>
            
            <div className="mt-5 flex justify-center gap-8">
               <div className="text-[9px] font-black text-zinc-800 uppercase tracking-widest flex items-center gap-2">
                 <kbd className="px-2 py-1 bg-zinc-950 border border-white/5 rounded-lg text-zinc-600 shadow-lg">SPACE</kbd> TOGGLE ENGINE
               </div>
               <div className="text-[9px] font-black text-zinc-800 uppercase tracking-widest flex items-center gap-2">
                 <kbd className="px-2 py-1 bg-zinc-950 border border-white/5 rounded-lg text-zinc-600 shadow-lg">#</kbd> TAG CLUSTERS
               </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
