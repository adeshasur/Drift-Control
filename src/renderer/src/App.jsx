import React, { useEffect, useState } from 'react'
import { useStore } from './store'
import { 
  Sun, Star, Calendar, User, Hash, Check, 
  Clock, Play, Pause, X, Plus, Search, Home, 
  Target, TrendingUp, ChevronRight, Layout, Zap
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

function WindowControls() {
  return (
    <div className="flex items-center no-drag h-10 pr-2">
      <button onClick={() => window.api?.minimize()} className="w-10 h-10 flex items-center justify-center hover:bg-white/5 transition-colors">
        <div className="w-3 h-[1px] bg-zinc-500" />
      </button>
      <button onClick={() => window.api?.maximize()} className="w-10 h-10 flex items-center justify-center hover:bg-white/5 transition-colors">
        <div className="w-3 h-3 border border-zinc-500 rounded-[1px]" />
      </button>
      <button onClick={() => window.api?.close()} className="w-10 h-10 flex items-center justify-center hover:bg-red-500/80 transition-colors group">
        <X size={14} className="text-zinc-500 group-hover:text-white" />
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
    return { label: 'Study', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' };
  }
  if (content.match(/code|fix|bug|react|css|js|electron|repo|github|dev|implementation|build|git|push/)) {
    return { label: 'Code', color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' };
  }
  if (content.match(/figma|ui|ux|logo|color|layout|design|aesthetic|mockup/)) {
    return { label: 'Design', color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' };
  }
  return { label: 'Personal', color: 'text-zinc-400', bg: 'bg-zinc-400/10', border: 'border-zinc-400/20' };
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
    if (e.key === 'Enter' && newLogContent.trim()) {
      await addTask(newLogContent.trim());
      setNewLogContent('');
    }
  };

  const totalDailySeconds = tasks.reduce((acc, t) => acc + (localDurations[t.id] || t.duration || 0), 0);
  const runningTask = tasks.find(t => t.is_running);
  
  // Progress calculation (Target 8 hours = 28800s)
  const targetSeconds = 8 * 3600;
  const progressPercent = Math.min((totalDailySeconds / targetSeconds) * 100, 100);

  return (
    <div className="flex h-screen w-full bg-[#0c0c0c] text-zinc-300 overflow-hidden font-sans">
      {/* Sidebar - Focus on Navigation & Stats */}
      <aside className="w-72 bg-[#111] border-r border-white/5 flex flex-col no-drag">
        <div className="p-6 draggable flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
            <Zap size={18} fill="currentColor" />
          </div>
          <span className="font-black text-sm tracking-tighter text-white uppercase italic">Drift.Log</span>
        </div>

        <div className="px-4 space-y-1">
          <div className="sidebar-item active"><Sun size={18} /> My Day</div>
          <div className="sidebar-item"><Calendar size={18} /> History</div>
          <div className="sidebar-item"><TrendingUp size={18} /> Insights</div>
        </div>

        <div className="mt-auto p-6 space-y-6 bg-black/20 border-t border-white/5">
          <div>
            <div className="flex justify-between items-end mb-2">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Daily Progress</span>
              <span className="text-xs font-mono font-bold text-zinc-300">{Math.round(progressPercent)}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
              />
            </div>
            <div className="mt-2 text-[10px] text-zinc-600">Goal: 8h Focus Time</div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Total Time</div>
              <div className="text-2xl font-mono font-black text-white leading-none">
                {formatDuration(totalDailySeconds)}
              </div>
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-emerald-500/20 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col no-drag relative">
        <header className="h-20 flex items-center justify-between px-8 draggable border-b border-white/5">
          <div className="no-drag">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.2em]">Live Session</span>
              <span className="text-[10px] text-zinc-600">• {new Date(selectedDate).toDateString()}</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Today's Achievements</h1>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-lg border border-white/5 no-drag cursor-pointer">
                <Calendar size={14} className="text-zinc-500" />
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent border-none text-xs font-bold text-zinc-300 outline-none cursor-pointer"
                />
             </div>
             <WindowControls />
          </div>
        </header>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto px-12 py-8 pb-32 scrollbar-hide">
          {/* Active Monitor Section */}
          {runningTask && (
            <div className="mb-12">
              <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" /> Currently Processing
              </h3>
              <div className="bg-blue-600/10 border border-blue-500/30 p-8 rounded-3xl flex justify-between items-center shadow-2xl shadow-blue-500/5">
                <div className="flex items-center gap-8">
                  <div className="w-16 h-16 rounded-2xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                    <Pause size={32} fill="currentColor" onClick={() => toggleTimer(runningTask.id, false)} className="cursor-pointer hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-white tracking-tight leading-tight">{runningTask.title}</h2>
                    <div className="text-sm font-mono font-bold text-blue-400 mt-2 flex items-center gap-2">
                      <Clock size={14} /> {formatDuration(localDurations[runningTask.id] || runningTask.duration)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-6">Completed Cycles</h3>
          
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {tasks.filter(t => !t.is_running || !runningTask).map(log => {
                const info = getCategoryInfo(log.title);
                const displayDuration = localDurations[log.id] || log.duration || 0;
                
                return (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={log.id} 
                    className="group bg-[#161616] border border-white/5 p-6 rounded-2xl flex justify-between items-center hover:bg-[#1c1c1c] hover:border-white/10 transition-all"
                  >
                    <div className="flex items-center gap-6">
                      <div className={`w-10 h-10 rounded-xl ${info.bg} ${info.color} flex items-center justify-center border ${info.border}`}>
                        <Check size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${info.bg} ${info.color}`}>
                            {info.label}
                          </span>
                          {displayDuration > 0 && (
                            <span className="text-xs font-mono font-bold text-zinc-500 flex items-center gap-1.5">
                              <Clock size={12} /> {formatDuration(displayDuration)}
                            </span>
                          )}
                        </div>
                        <p className="text-xl text-zinc-200 font-bold tracking-tight">{log.title}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {!log.is_running && (
                        <button 
                          onClick={() => toggleTimer(log.id, true)}
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/5 transition-all"
                        >
                          <Play size={22} fill="currentColor" />
                        </button>
                      )}
                      <button onClick={() => deleteTask(log.id)} className="w-12 h-12 rounded-xl flex items-center justify-center text-zinc-800 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all">
                        <X size={22} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {tasks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-40 opacity-20 text-center">
                <div className="w-20 h-20 rounded-[2rem] border-2 border-dashed border-white flex items-center justify-center mb-6">
                  <Layout size={32} />
                </div>
                <p className="text-sm font-bold uppercase tracking-[0.2em]">Ready for input</p>
              </div>
            )}
          </div>
        </div>

        {/* Smart Input Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-[#0c0c0c] via-[#0c0c0c] to-transparent">
          <div className="max-w-4xl mx-auto">
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                if (newLogContent.trim()) {
                  await addTask(newLogContent.trim());
                  setNewLogContent('');
                }
              }}
              className="h-16 bg-[#161616] border border-white/10 rounded-2xl flex items-center px-6 gap-4 focus-within:border-blue-500/50 shadow-2xl transition-all"
            >
              <Plus size={22} className="text-blue-500" />
              <input 
                type="text" 
                placeholder="Initialize new log entry... (e.g. Started React Implementation)" 
                value={newLogContent}
                onChange={(e) => setNewLogContent(e.target.value)}
                className="bg-transparent flex-1 text-base font-medium outline-none placeholder:text-zinc-700 no-drag" 
              />
              <button type="submit" className="hidden" />
              <div className="flex items-center gap-3 text-zinc-600 no-drag">
                <div className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center cursor-pointer"><Hash size={16} /></div>
                <div className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center cursor-pointer"><Target size={16} /></div>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
