import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlarmClock,
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  Clock3,
  Flame,
  Gauge,
  GripVertical,
  LayoutDashboard,
  ListFilter,
  Pause,
  Pencil,
  Play,
  Plus,
  Search,
  Sparkles,
  Tag,
  Trash2,
  Trophy,
  X
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from './store'

const CATEGORIES = ['Work', 'Study', 'Personal', 'Health', 'General']
const PRIORITIES = ['High', 'Medium', 'Low']

function formatDuration(totalSeconds = 0) {
  const safe = Math.max(0, Number(totalSeconds || 0))
  const h = Math.floor(safe / 3600)
  const m = Math.floor((safe % 3600) / 60)
  const s = safe % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function getLocalDateString() {
  const now = new Date()
  const tzOffsetMs = now.getTimezoneOffset() * 60 * 1000
  return new Date(now.getTime() - tzOffsetMs).toISOString().slice(0, 10)
}

function formatMs(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatDueLabel(dueDate) {
  if (!dueDate) return 'No deadline'
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const due = new Date(dueDate)
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  const diff = Math.round((dueDay.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return 'Due today'
  if (diff === 1) return 'Due tomorrow'
  if (diff < 0) return `Overdue ${Math.abs(diff)}d`
  return due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function WindowControls() {
  return (
    <div className="window-controls no-drag">
      <button onClick={() => window.api?.minimize()} aria-label="Minimize window">
        <span className="window-line" />
      </button>
      <button onClick={() => window.api?.maximize()} aria-label="Maximize window">
        <span className="window-square" />
      </button>
      <button onClick={() => window.api?.close()} className="window-close" aria-label="Close window">
        <X size={14} />
      </button>
    </div>
  )
}

function notify(title, body) {
  if (!('Notification' in window)) return
  if (Notification.permission === 'granted') {
    new Notification(title, { body })
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') new Notification(title, { body })
    })
  }
}

export default function App() {
  const {
    tasks,
    selectedDate,
    fetchWorkspaces,
    addTask,
    updateTaskMeta,
    reorderTasks,
    deleteTask,
    toggleTimer,
    toggleCurrentTimer,
    setTaskCompleted,
    setAlwaysOnTop
  } = useStore()

  const inputRef = useRef(null)
  const searchRef = useRef(null)

  const [taskTitle, setTaskTitle] = useState('')
  const [category, setCategory] = useState('Work')
  const [priority, setPriority] = useState('Medium')
  const [dueDate, setDueDate] = useState(getLocalDateString())
  const [startNow, setStartNow] = useState(true)
  const [focusMinutes, setFocusMinutes] = useState(25)
  const [breakMinutes, setBreakMinutes] = useState(5)

  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('All')
  const [filterPriority, setFilterPriority] = useState('All')
  const [smartFilter, setSmartFilter] = useState('all')
  const [viewMode, setViewMode] = useState('board')
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [editingTitle, setEditingTitle] = useState('')

  const [localDurations, setLocalDurations] = useState({})
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false)
  const [draggedId, setDraggedId] = useState(null)
  const [formError, setFormError] = useState('')

  const [pomodoro, setPomodoro] = useState({
    mode: 'focus',
    endAt: null,
    sessionCount: 0,
    runningTaskId: null
  })
  const [pomodoroTick, setPomodoroTick] = useState(() => Date.now())
  const sectionVariants = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { staggerChildren: 0.06, delayChildren: 0.02 } }
  }
  const cardVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.99 },
    show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.26 } }
  }

  useEffect(() => {
    fetchWorkspaces()
  }, [fetchWorkspaces])

  useEffect(() => {
    const interval = setInterval(() => {
      const updates = {}
      tasks.forEach((task) => {
        if (task.is_running && task.last_started_at) {
          const elapsed = Math.floor((Date.now() - new Date(task.last_started_at).getTime()) / 1000)
          updates[task.id] = (task.duration || 0) + Math.max(0, elapsed)
        }
      })
      if (Object.keys(updates).length > 0) {
        setLocalDurations((prev) => ({ ...prev, ...updates }))
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [tasks])

  useEffect(() => {
    const saved = window.localStorage.getItem('drift-ui-prefs')
    if (!saved) return
    try {
      const prefs = JSON.parse(saved)
      if (prefs.category) setCategory(prefs.category)
      if (prefs.priority) setPriority(prefs.priority)
      if (typeof prefs.startNow === 'boolean') setStartNow(prefs.startNow)
      if (typeof prefs.focusMinutes === 'number') setFocusMinutes(prefs.focusMinutes)
      if (typeof prefs.breakMinutes === 'number') setBreakMinutes(prefs.breakMinutes)
      if (prefs.filterCategory) setFilterCategory(prefs.filterCategory)
      if (prefs.filterPriority) setFilterPriority(prefs.filterPriority)
      if (prefs.smartFilter) setSmartFilter(prefs.smartFilter)
      if (prefs.viewMode) setViewMode(prefs.viewMode)
    } catch (error) {
      console.warn('Failed to load UI prefs', error)
    }
  }, [])

  useEffect(() => {
    const prefs = {
      category,
      priority,
      startNow,
      focusMinutes,
      breakMinutes,
      filterCategory,
      filterPriority,
      smartFilter,
      viewMode
    }
    window.localStorage.setItem('drift-ui-prefs', JSON.stringify(prefs))
  }, [category, priority, startNow, focusMinutes, breakMinutes, filterCategory, filterPriority, smartFilter, viewMode])

  useEffect(() => {
    const interval = setInterval(() => setPomodoroTick(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const displayedTasks = useMemo(
    () =>
      tasks.map((task) => ({
        ...task,
        liveDuration: localDurations[task.id] ?? task.duration ?? 0
      })),
    [tasks, localDurations]
  )

  const runningTask = displayedTasks.find((task) => task.is_running && !task.completed_at)

  useEffect(() => {
    if (!runningTask) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPomodoro((prev) => ({ ...prev, runningTaskId: null, endAt: null }))
      return
    }

    if (pomodoro.runningTaskId !== runningTask.id || !pomodoro.endAt) {
      const ms = (runningTask.pomodoro_focus || 25) * 60 * 1000
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPomodoro((prev) => ({
        ...prev,
        mode: 'focus',
        runningTaskId: runningTask.id,
        endAt: Date.now() + ms
      }))
    }
  }, [runningTask, pomodoro.runningTaskId, pomodoro.endAt])

  useEffect(() => {
    if (!pomodoro.endAt || !runningTask) return
    if (pomodoroTick < pomodoro.endAt) return

    if (pomodoro.mode === 'focus') {
      const nextSessions = pomodoro.sessionCount + 1
      const longBreak = nextSessions % 4 === 0
      const restMinutes = longBreak ? Math.max((runningTask.pomodoro_break || 5) * 3, 10) : runningTask.pomodoro_break || 5
      notify('Focus complete', `${runningTask.title} finished. ${longBreak ? 'Long' : 'Short'} break started.`)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPomodoro((prev) => ({
        ...prev,
        mode: longBreak ? 'long-break' : 'break',
        endAt: Date.now() + restMinutes * 60 * 1000,
        sessionCount: nextSessions
      }))
      return
    }

    notify('Break complete', 'Ready for the next focus sprint.')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPomodoro((prev) => ({
      ...prev,
      mode: 'focus',
      endAt: Date.now() + (runningTask.pomodoro_focus || 25) * 60 * 1000
    }))
  }, [pomodoroTick, pomodoro, runningTask])

  const onKeyDown = React.useCallback((e) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'n') {
      e.preventDefault()
      inputRef.current?.focus()
    }
    if (e.ctrlKey && e.key.toLowerCase() === 'f') {
      e.preventDefault()
      searchRef.current?.focus()
    }
    if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'SELECT') {
      e.preventDefault()
      toggleCurrentTimer()
    }
  }, [toggleCurrentTimer])

  useEffect(() => {
    const onAdd = () => inputRef.current?.focus()
    const onToggle = () => toggleCurrentTimer()

    window.api?.onShortcutAddTask?.(onAdd)
    window.api?.onShortcutToggleTimer?.(onToggle)

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.api?.removeShortcutAddTask?.(onAdd)
      window.api?.removeShortcutToggleTimer?.(onToggle)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [toggleCurrentTimer, onKeyDown])

  const visibleTodoTasks = useMemo(() => {
    const q = search.trim().toLowerCase()
    return displayedTasks
      .filter((task) => !task.completed_at)
      .filter((task) => (filterCategory === 'All' ? true : task.category === filterCategory))
      .filter((task) => (filterPriority === 'All' ? true : task.priority === filterPriority))
      .filter((task) => {
        if (smartFilter === 'overdue') return !!task.due_date && new Date(task.due_date).getTime() < new Date().setHours(0, 0, 0, 0)
        if (smartFilter === 'running') return task.is_running
        if (smartFilter === 'high') return task.priority === 'High'
        return true
      })
      .filter((task) => (q ? `${task.title} ${task.category} ${task.priority}`.toLowerCase().includes(q) : true))
  }, [displayedTasks, search, filterCategory, filterPriority, smartFilter])

  const completedTasks = displayedTasks.filter((task) => !!task.completed_at)
  const todaySeconds = displayedTasks.reduce((sum, task) => sum + task.liveDuration, 0)
  const todayTargetSeconds = 8 * 3600
  const todayProgress = Math.min(100, Math.round((todaySeconds / todayTargetSeconds) * 100))

  const analytics = useMemo(() => {
    const categoryMap = {}
    let overdue = 0
    let done = 0

    displayedTasks.forEach((task) => {
      if (task.completed_at) done += 1
      const key = task.category || 'General'
      categoryMap[key] = (categoryMap[key] || 0) + task.liveDuration
      if (!task.completed_at && task.due_date && new Date(task.due_date).getTime() < new Date().setHours(0, 0, 0, 0)) overdue += 1
    })

    const rows = Object.entries(categoryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    return {
      done,
      overdue,
      focusScore: Math.round(Math.min(100, done * 18 + todaySeconds / 1800)),
      rows
    }
  }, [displayedTasks, todaySeconds])

  const pomodoroRemainingMs = pomodoro.endAt ? Math.max(0, pomodoro.endAt - pomodoroTick) : 0
  const pomodoroTotalMs = useMemo(() => {
    if (!runningTask) return 0
    if (pomodoro.mode === 'focus') return (runningTask.pomodoro_focus || 25) * 60 * 1000
    if (pomodoro.mode === 'long-break') return Math.max((runningTask.pomodoro_break || 5) * 3, 10) * 60 * 1000
    return (runningTask.pomodoro_break || 5) * 60 * 1000
  }, [runningTask, pomodoro.mode])

  const pomodoroProgress = pomodoroTotalMs > 0 ? Math.min(100, Math.round(((pomodoroTotalMs - pomodoroRemainingMs) / pomodoroTotalMs) * 100)) : 0

  async function handleAddTask(e) {
    e.preventDefault()
    const trimmed = taskTitle.trim()
    if (!trimmed) {
      return
    }

    try {
      setFormError('')
      await addTask({
        content: trimmed,
        category,
        priority,
        dueDate: dueDate || null,
        startNow,
        pomodoroFocus: focusMinutes,
        pomodoroBreak: breakMinutes
      })

      setTaskTitle('')
      setDueDate(getLocalDateString())
      if (startNow) notify('Timer started', trimmed)
    } catch (error) {
      const message = error?.message || 'Unable to add task.'
      setFormError(message)
      notify('Add Task failed', message)
      console.error('Add task failed:', error)
    }
  }

  async function handleDrop(targetId) {
    if (!draggedId || draggedId === targetId) return

    const currentIds = visibleTodoTasks.map((task) => task.id)
    const from = currentIds.indexOf(draggedId)
    const to = currentIds.indexOf(targetId)
    if (from === -1 || to === -1) return

    const next = [...currentIds]
    next.splice(to, 0, next.splice(from, 1)[0])

    await reorderTasks(next)
    setDraggedId(null)
  }

  async function saveTaskTitle(taskId) {
    const trimmed = editingTitle.trim()
    if (!trimmed) return
    await updateTaskMeta({ id: taskId, title: trimmed })
    setEditingTaskId(null)
    setEditingTitle('')
  }

  async function handleDeleteTask(task) {
    if (task.is_running) {
      const ok = window.confirm('This task timer is running. Delete anyway?')
      if (!ok) return
    }
    await deleteTask(task.id)
  }

  async function clearCompletedTasks() {
    if (completedTasks.length === 0) return
    const ok = window.confirm(`Delete all ${completedTasks.length} completed tasks?`)
    if (!ok) return
    for (const task of completedTasks) {
      // eslint-disable-next-line no-await-in-loop
      await deleteTask(task.id)
    }
  }

  async function togglePin() {
    const next = !isAlwaysOnTop
    setIsAlwaysOnTop(next)
    await setAlwaysOnTop(next)
  }

  return (
    <div className="app-shell">
      <header className="app-header draggable">
        <div className="header-left no-drag">
          <div className={`brand-dot ${runningTask ? 'running' : ''}`} />
          <div>
            <p className="brand-title">Drift Pro Command Deck</p>
            <p className="brand-subtitle">{new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
          </div>
        </div>

        <div className="header-right no-drag">
          <div className="stat-pill">
            <Clock3 size={14} />
            <span>Today {formatDuration(todaySeconds)}</span>
          </div>
          <button className={`pin-btn ${isAlwaysOnTop ? 'active' : ''}`} onClick={togglePin}>
            <ArrowUp size={13} /> {isAlwaysOnTop ? 'Pinned' : 'Pin Mini'}
          </button>
          <WindowControls />
        </div>
      </header>

      <main className="board-wrap">
        <motion.section className="left-rail" variants={sectionVariants} initial="hidden" animate="show">
          <motion.article className="add-card" variants={cardVariants}>
            <form onSubmit={handleAddTask} className="add-form">
              <label className="field-label" htmlFor="task-input">New Task</label>
              <div className="task-input-row">
                <Plus size={18} />
                <input
                  ref={inputRef}
                  id="task-input"
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Write short note, build feature, revise chapter..."
                />
              </div>

              <div className="triple-grid">
                <label>
                  <span className="field-label">Category</span>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}>
                    {CATEGORIES.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="field-label">Priority</span>
                  <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                    {PRIORITIES.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="field-label">Due Date</span>
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </label>
              </div>

              <div className="timer-grid">
                <label>
                  <span className="field-label">Focus (min)</span>
                  <input type="number" min="5" max="120" value={focusMinutes} onChange={(e) => setFocusMinutes(Number(e.target.value || 25))} />
                </label>
                <label>
                  <span className="field-label">Break (min)</span>
                  <input type="number" min="1" max="30" value={breakMinutes} onChange={(e) => setBreakMinutes(Number(e.target.value || 5))} />
                </label>
              </div>

              <label className="toggle-wrap">
                <input type="checkbox" checked={startNow} onChange={(e) => setStartNow(e.target.checked)} />
                <span>Start timer immediately after add</span>
              </label>

              <motion.button 
                type="submit"
                className="primary-btn"
                whileHover={{ scale: 1.01, y: -1 }}
                whileTap={{ scale: 0.985 }}
                onClick={(e) => {
                  if (!taskTitle.trim()) {
                    e.preventDefault()
                    inputRef.current?.focus()
                  }
                }}
              >
                Add Task
              </motion.button>
              {formError && <p className="form-error">{formError}</p>}
            </form>
          </motion.article>

          <motion.article layout className="pomodoro-card" variants={cardVariants}>
            <div className="pomodoro-head">
              <h3>Pomodoro Pro</h3>
              <span>{pomodoro.mode}</span>
            </div>
            <div className="pomodoro-ring-wrap">
              <div className="pomodoro-ring">
                <div className="pomodoro-ring-fill" style={{ '--p': `${pomodoroProgress}%` }} />
                <div className="pomodoro-ring-core">{formatMs(pomodoroRemainingMs)}</div>
              </div>
            </div>
            <p className="pomodoro-sub">
              {runningTask ? runningTask.title : 'Start a task timer to activate cycles'}
            </p>
            <div className="pomodoro-meta">
              <span><Flame size={13} /> Sessions {pomodoro.sessionCount}</span>
              <button className="ghost-btn" onClick={() => toggleCurrentTimer()}>
                {runningTask ? <Pause size={14} /> : <Play size={14} />} {runningTask ? 'Pause' : 'Resume'}
              </button>
            </div>
          </motion.article>

          <motion.article layout className="analytics-card" variants={cardVariants}>
            <h3>Analytics</h3>
            <div className="analytics-grid">
              <div>
                <p className="metric-label">Focus Score</p>
                <p className="metric-value"><Gauge size={15} /> {analytics.focusScore}</p>
              </div>
              <div>
                <p className="metric-label">Completed</p>
                <p className="metric-value">{analytics.done}</p>
              </div>
              <div>
                <p className="metric-label">Overdue</p>
                <p className="metric-value warning">{analytics.overdue}</p>
              </div>
              <div>
                <p className="metric-label">Streak</p>
                <p className="metric-value"><Trophy size={15} /> {Math.min(analytics.done, 12)}d</p>
              </div>
            </div>

            <div className="bar-list">
              {analytics.rows.length === 0 && <p className="empty-state">No tracked data yet.</p>}
              {analytics.rows.map(([key, value]) => (
                <div key={key} className="bar-row">
                  <span>{key}</span>
                  <div>
                    <i style={{ width: `${Math.min(100, Math.round((value / Math.max(todaySeconds, 1)) * 100))}%` }} />
                  </div>
                  <strong>{formatDuration(value)}</strong>
                </div>
              ))}
            </div>
          </motion.article>
        </motion.section>

        <motion.section className="list-zone" variants={sectionVariants} initial="hidden" animate="show">
          <motion.div className="hero-panel" variants={cardVariants}>
            <div className="hero-title-row">
              <h2><Sparkles size={15} /> Daily Momentum</h2>
              <div className="view-toggle">
                <button className={viewMode === 'board' ? 'active' : ''} onClick={() => setViewMode('board')}><LayoutDashboard size={13} /> Board</button>
                <button className={viewMode === 'focus' ? 'active' : ''} onClick={() => setViewMode('focus')}><ListFilter size={13} /> Focus</button>
              </div>
            </div>
            <div className="hero-progress-line"><i style={{ width: `${todayProgress}%` }} /></div>
            <div className="hero-meta">
              <span>{todayProgress}% of 8h target</span>
              <span>{runningTask ? `Running: ${runningTask.title}` : 'No timer running'}</span>
            </div>
          </motion.div>

          <div className="filter-row">
            <div className="search-wrap">
              <Search size={14} />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks, categories, priorities"
              />
            </div>

            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="All">All Categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>

            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
              <option value="All">All Priorities</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="quick-filters">
            <motion.button whileTap={{ scale: 0.96 }} className={smartFilter === 'all' ? 'active' : ''} onClick={() => setSmartFilter('all')}>All</motion.button>
            <motion.button whileTap={{ scale: 0.96 }} className={smartFilter === 'running' ? 'active' : ''} onClick={() => setSmartFilter('running')}>Running</motion.button>
            <motion.button whileTap={{ scale: 0.96 }} className={smartFilter === 'overdue' ? 'active' : ''} onClick={() => setSmartFilter('overdue')}>Overdue</motion.button>
            <motion.button whileTap={{ scale: 0.96 }} className={smartFilter === 'high' ? 'active' : ''} onClick={() => setSmartFilter('high')}>High Priority</motion.button>
          </div>

          <div className={`list-columns ${viewMode === 'focus' ? 'focus-mode' : ''}`}>
            <article className="list-card">
              <div className="list-head"><h2>To Do</h2><span>{visibleTodoTasks.length}</span></div>
              <div className="task-list">
                <AnimatePresence>
                  {visibleTodoTasks.length === 0 && <p className="empty-state">No tasks match current filters.</p>}
                  {visibleTodoTasks.map((task) => {
                    const overdue = task.due_date && !task.completed_at && new Date(task.due_date).getTime() < new Date().setHours(0, 0, 0, 0)
                    return (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        whileHover={{ y: -2 }}
                        className={`task-item ${task.is_running ? 'running' : ''} ${overdue ? 'overdue' : ''}`}
                        draggable
                        onDragStart={() => setDraggedId(task.id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleDrop(task.id)}
                      >
                        <div className="task-top">
                          {editingTaskId === task.id ? (
                            <input
                              className="task-edit-input"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onBlur={() => saveTaskTitle(task.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveTaskTitle(task.id)
                                if (e.key === 'Escape') {
                                  setEditingTaskId(null)
                                  setEditingTitle('')
                                }
                              }}
                              autoFocus
                            />
                          ) : (
                            <p className="task-title">{task.title}</p>
                          )}
                          <div className="task-badges">
                            <span className={`priority-chip ${task.priority?.toLowerCase()}`}>{task.priority || 'Medium'}</span>
                            <span className="category-chip"><Tag size={11} /> {task.category || 'General'}</span>
                          </div>
                        </div>

                        <div className="task-meta-row compact">
                          <div className="mini-field">
                            <span>Due</span>
                            <input
                              type="date"
                              value={task.due_date || ''}
                              onChange={(e) => updateTaskMeta({ id: task.id, due_date: e.target.value || null })}
                            />
                          </div>
                          <div className="mini-field">
                            <span>Priority</span>
                            <select value={task.priority || 'Medium'} onChange={(e) => updateTaskMeta({ id: task.id, priority: e.target.value })}>
                              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                            </select>
                          </div>
                          <div className="task-time-stack">
                            <span className="time-text">{formatDuration(task.liveDuration)}</span>
                            <span className={`due-chip ${overdue ? 'overdue' : ''}`}>{formatDueLabel(task.due_date)}</span>
                          </div>
                        </div>

                        <div className="task-actions">
                          <motion.button whileTap={{ scale: 0.95 }} className="icon-btn" title="Drag hint"><GripVertical size={15} /></motion.button>
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              setEditingTaskId(task.id)
                              setEditingTitle(task.title || '')
                            }}
                            className="icon-btn"
                            title="Edit title"
                          >
                            {editingTaskId === task.id ? <Check size={15} /> : <Pencil size={15} />}
                          </motion.button>
                          <motion.button whileTap={{ scale: 0.95 }} onClick={() => toggleTimer(task.id, !task.is_running)} className="icon-btn" title={task.is_running ? 'Pause' : 'Start'}>
                            {task.is_running ? <Pause size={16} /> : <Play size={16} />}
                          </motion.button>
                          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setTaskCompleted(task.id, true)} className="icon-btn success" title="Complete"><CheckCircle2 size={16} /></motion.button>
                          <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleDeleteTask(task)} className="icon-btn danger" title="Delete"><Trash2 size={16} /></motion.button>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </article>

            {viewMode === 'board' && (
              <article className="list-card">
                <div className="list-head">
                  <h2>Completed</h2>
                  <div className="completed-head-tools">
                    <span>{completedTasks.length}</span>
                    <button className="mini-clear-btn" onClick={clearCompletedTasks}>Clear</button>
                  </div>
                </div>
                <div className="task-list">
                  {completedTasks.length === 0 && <p className="empty-state">Completed items appear here.</p>}
                  {completedTasks.map((task) => (
                    <div key={task.id} className="task-item done">
                      <div className="task-top">
                        <p className="task-title">{task.title}</p>
                        <CheckCircle2 size={16} className="done-icon" />
                      </div>
                      <div className="task-bottom">
                        <span className="time-text">{formatDuration(task.liveDuration)}</span>
                        <span className="done-at">{new Date(task.completed_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="task-actions">
                        <button onClick={() => setTaskCompleted(task.id, false)} className="icon-btn">Undo</button>
                        <button onClick={() => handleDeleteTask(task)} className="icon-btn danger">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            )}
          </div>

          <div className="shortcut-strip">
            <span><AlarmClock size={13} /> Shortcuts:</span>
            <span><kbd>Ctrl+N</kbd> Add</span>
            <span><kbd>Ctrl+F</kbd> Search</span>
            <span><kbd>Space</kbd> Start/Pause</span>
            <span><kbd>Ctrl+Shift+P</kbd> Tray Timer</span>
            <button className="ghost-btn" onClick={() => toggleCurrentTimer()}><ArrowDown size={13} /> Quick Toggle</button>
          </div>
        </motion.section>
      </main>
    </div>
  )
}
