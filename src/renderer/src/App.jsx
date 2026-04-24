import React, { useEffect, useState } from 'react'
import { useStore } from './store'
import { Folder, Code, Plus, Search, CheckCircle, Clock, AlertCircle, Link as LinkIcon, Play, X } from 'lucide-react'
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

const getCategoryInfo = (text) => {
  const content = text.toLowerCase();
  
  if (content.match(/ucsc|nibm|bit|exam|study|assignment|semester|degree|learn|reading|class/)) {
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
    fetchWorkspaces, addTask, deleteTask, setSelectedDate
  } = useStore();

  const [isAddingLog, setIsAddingLog] = useState(false);
  const [newLogContent, setNewLogContent] = useState('');

  useEffect(() => {
    fetchWorkspaces();
  }, []);

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

  return (
    <div className="flex h-screen w-full font-sans draggable overflow-hidden bg-zinc-950 text-white">
      <WindowControls />
      
      {/* Main Content Area - Centered Layout */}
      <div className="flex-1 flex flex-col no-drag overflow-hidden max-w-4xl mx-auto border-x border-white/5 bg-zinc-900/30 shadow-2xl">
        {/* Header */}
        <div className="h-48 border-b border-glass-border flex flex-col justify-end px-16 pb-10 bg-gradient-to-b from-transparent to-black/20">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-xs font-black tracking-[0.3em] text-zinc-600 uppercase mb-3">System.Drift</h1>
              <h2 className="text-5xl font-black tracking-tighter">Daily Log</h2>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 bg-white/5 px-6 py-3 rounded-2xl border border-white/10 hover:border-white/20 transition-all cursor-pointer group shadow-inner">
                <Clock size={18} className="text-blue-400 group-hover:scale-110 transition-transform" />
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent border-none text-sm font-mono font-bold text-zinc-200 outline-none cursor-pointer"
                />
              </div>
              <button 
                onClick={() => setIsAddingLog(true)} 
                className="w-14 h-14 bg-white text-black rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-white/10"
              >
                <Plus size={28} strokeWidth={3} />
              </button>
            </div>
          </div>
        </div>

        {/* Logs Area */}
        <div className="flex-1 overflow-y-auto px-16 py-12 scrollbar-hide">
          <div className="max-w-2xl mx-auto space-y-8">
            <AnimatePresence mode="popLayout">
              {isAddingLog && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="glass-panel p-8 rounded-[2rem] border-white/10 shadow-2xl bg-white/[0.02]"
                >
                  <input
                    autoFocus
                    type="text"
                    placeholder="Type achievement... (e.g. Coded Login Page)"
                    value={newLogContent}
                    onChange={(e) => setNewLogContent(e.target.value)}
                    onKeyDown={handleAddLog}
                    onBlur={() => !newLogContent && setIsAddingLog(false)}
                    className="w-full bg-transparent text-2xl outline-none font-bold placeholder:text-zinc-800 tracking-tight"
                  />
                  <div className="mt-6 flex items-center gap-3">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                    <span className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em]">Auto-Detect Categories</span>
                  </div>
                </motion.div>
              )}

              {tasks.length > 0 ? tasks.map(log => {
                const info = getCategoryInfo(log.title);
                return (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={log.id} 
                    className="glass-panel p-7 rounded-[2rem] group hover:bg-white/[0.04] transition-all flex justify-between items-center border-white/5 shadow-lg"
                  >
                    <div className="flex items-center gap-8">
                      <div className={`w-14 h-14 rounded-2xl ${info.bg} ${info.color} flex items-center justify-center border ${info.border} shadow-inner`}>
                        {info.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded ${info.bg} ${info.color}`}>
                            {info.label}
                          </span>
                        </div>
                        <p className="text-2xl text-zinc-100 font-bold tracking-tight leading-tight">{log.title}</p>
                      </div>
                    </div>
                    <button onClick={() => deleteTask(log.id)} className="w-12 h-12 rounded-2xl flex items-center justify-center text-zinc-800 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all">
                      <X size={24} />
                    </button>
                  </motion.div>
                );
              }) : !isAddingLog && (
                <div className="flex flex-col items-center justify-center py-40">
                  <div className="w-24 h-24 rounded-[2rem] border-2 border-dashed border-zinc-800 flex items-center justify-center mb-8">
                    <Folder size={32} className="text-zinc-800" />
                  </div>
                  <p className="text-xl font-black text-zinc-800 uppercase tracking-[0.3em]">Zero Drift</p>
                  <p className="text-zinc-700 mt-2 font-medium">Nothing logged for this date yet</p>
                  <button 
                    onClick={() => setIsAddingLog(true)}
                    className="mt-8 text-blue-500 font-black uppercase tracking-widest text-xs hover:text-blue-400 transition-colors"
                  >
                    + Log Activity
                  </button>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer Stats */}
        <div className="p-10 border-t border-white/5 bg-black/30 backdrop-blur-md">
          <div className="max-w-2xl mx-auto flex justify-between items-center">
            <div className="flex gap-16">
              <div>
                <div className="text-3xl font-black tracking-tighter">{tasks.length}</div>
                <div className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Daily Achievements</div>
              </div>
              <div className="hidden sm:block">
                <div className="text-3xl font-black tracking-tighter text-emerald-400">
                  {tasks.filter(t => getCategoryInfo(t.title).label === 'Development').length}
                </div>
                <div className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Dev Commits</div>
              </div>
            </div>
            <div className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em] flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Live Tracking Enabled
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
