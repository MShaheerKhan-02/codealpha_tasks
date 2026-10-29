import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { io } from 'socket.io-client'
import {
  Activity, ArrowUpRight, Bell, CalendarDays, CheckCheck, ChevronDown, CircleHelp,
  Inbox, LayoutGrid, ListFilter, LogOut,
  MessageCircle, MoreHorizontal, Plus, Search, Settings2, Sparkles, Users,
  X,
} from 'lucide-react'
import './App.css'

type User = { id: number; name: string; email: string; color: string }
type Project = { id: number; name: string; description: string; color: string }
type Task = {
  id: number; project_id: number; title: string; description: string; status: string
  priority: string; assignee_id: number | null; assignee_name?: string
  assignee_color?: string; due_date: string | null; comment_count: number
}
type Comment = { id: number; task_id: number; user_id: number; user_name: string; user_color: string; body: string; created_at: string }
type Notification = { id: number; message: string; read: number; task_title?: string; created_at: string }
type Workspace = { projects: Project[]; tasks: Task[]; users: User[]; comments: Comment[]; notifications: Notification[] }
type Modal = 'project' | 'task' | 'invite' | 'detail' | null

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const columns = [
  { id: 'todo', label: 'To do', color: 'stone' },
  { id: 'progress', label: 'In progress', color: 'green' },
  { id: 'done', label: 'Done', color: 'blue' },
]
const initialWorkspace: Workspace = { projects: [], tasks: [], users: [], comments: [], notifications: [] }

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('loopwork-token') || '')
  const [user, setUser] = useState<User | null>(null)
  const [workspace, setWorkspace] = useState<Workspace>(initialWorkspace)
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null)
  const [activeModal, setActiveModal] = useState<Modal>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [activeView, setActiveView] = useState<'board' | 'activity'>('board')
  const [showNotifications, setShowNotifications] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const request = useCallback(async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
    })
    const body = await response.json()
    if (!response.ok) throw new Error(body.error || 'Something went wrong.')
    return body as T
  }, [token])

  const loadWorkspace = useCallback(async () => {
    const data = await request<Workspace>('/api/workspace')
    setWorkspace(data)
    setActiveProjectId((current) => current && data.projects.some((project) => project.id === current) ? current : data.projects[0]?.id ?? null)
  }, [request])

  useEffect(() => {
    if (!token) return
    let active = true
    Promise.all([request<User>('/api/auth/me'), request<Workspace>('/api/workspace')])
      .then(([profile, data]) => {
        if (!active) return
        setUser(profile)
        setWorkspace(data)
        setActiveProjectId((current) => current ?? data.projects[0]?.id ?? null)
      })
      .catch(() => {
        localStorage.removeItem('loopwork-token')
        setToken('')
        setUser(null)
      })
    const socket = io(API_URL, { auth: { token } })
    socket.on('workspace:updated', () => { if (active) void loadWorkspace() })
    socket.on('notification:new', () => { if (active) void loadWorkspace() })
    return () => { active = false; socket.disconnect() }
  }, [token, request, loadWorkspace])

  const activeProject = workspace.projects.find((project) => project.id === activeProjectId)
  const projectTasks = useMemo(() => workspace.tasks.filter((task) => task.project_id === activeProjectId && task.title.toLowerCase().includes(search.toLowerCase())), [workspace.tasks, activeProjectId, search])
  const selectedTask = workspace.tasks.find((task) => task.id === selectedTaskId)
  const unreadCount = workspace.notifications.filter((notification) => !notification.read).length
  const projectComments = workspace.comments.filter((comment) => comment.task_id === selectedTaskId)

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const form = new FormData(event.currentTarget)
    try {
      const result = await request<{ token: string; user: User }>(`/api/auth/${authMode}`, {
        method: 'POST', body: JSON.stringify({ name: form.get('name'), email: form.get('email'), password: form.get('password') }),
      })
      localStorage.setItem('loopwork-token', result.token)
      setToken(result.token)
      setUser(result.user)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to sign in.') }
    finally { setBusy(false) }
  }

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setBusy(true)
    setError('')
    try {
      const project = await request<Project>('/api/projects', { method: 'POST', body: JSON.stringify({ name: form.get('name'), description: form.get('description') }) })
      setWorkspace((current) => ({ ...current, projects: [project, ...current.projects] }))
      setActiveProjectId(project.id)
      setActiveModal(null)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not create project.') }
    finally { setBusy(false) }
  }

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeProjectId) return
    const form = new FormData(event.currentTarget)
    setBusy(true)
    setError('')
    try {
      await request('/api/tasks', { method: 'POST', body: JSON.stringify({ projectId: activeProjectId, title: form.get('title'), description: form.get('description'), status: form.get('status'), priority: form.get('priority'), assigneeId: form.get('assigneeId') || null, dueDate: form.get('dueDate') || null }) })
      await loadWorkspace()
      setActiveModal(null)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not create task.') }
    finally { setBusy(false) }
  }

  async function updateTask(taskId: number, patch: Record<string, unknown>) {
    try {
      await request(`/api/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(patch) })
      await loadWorkspace()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not update task.') }
  }

  async function addComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedTaskId) return
    const form = new FormData(event.currentTarget)
    const body = String(form.get('body') || '')
    try {
      await request(`/api/tasks/${selectedTaskId}/comments`, { method: 'POST', body: JSON.stringify({ body }) })
      event.currentTarget.reset()
      await loadWorkspace()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not post comment.') }
  }

  async function inviteMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeProjectId) return
    const form = new FormData(event.currentTarget)
    try {
      await request(`/api/projects/${activeProjectId}/members`, { method: 'POST', body: JSON.stringify({ userId: Number(form.get('userId')) }) })
      await loadWorkspace()
      setActiveModal(null)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not add teammate.') }
  }

  async function markRead(id: number) {
    await request(`/api/notifications/${id}/read`, { method: 'PATCH' })
    setWorkspace((current) => ({ ...current, notifications: current.notifications.map((item) => item.id === id ? { ...item, read: 1 } : item) }))
  }

  function signOut() {
    localStorage.removeItem('loopwork-token')
    setToken('')
    setUser(null)
    setWorkspace(initialWorkspace)
  }

  if (!user) return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="brand-lockup"><span className="brand-mark"><LayoutGrid size={18} /></span><span>loopwork</span></div>
        <div className="auth-copy"><span className="eyebrow">A little more in sync</span><h1>Make good work<br /><em>happen together.</em></h1><p>One calm place for the work, the people, and all the in-between.</p></div>
        <div className="auth-note"><Sparkles size={16} /><span>Less chasing. More making.</span></div>
      </section>
      <section className="auth-form-side">
        <form className="auth-form" onSubmit={authenticate}>
          <div className="form-heading"><span className="eyebrow">Your workspace awaits</span><h2>{authMode === 'login' ? 'Welcome back' : 'Create your account'}</h2><p>{authMode === 'login' ? 'Sign in to pick up where your team left off.' : 'Bring your team and good ideas together.'}</p></div>
          {authMode === 'register' && <label>Your name<input name="name" placeholder="Alex Morgan" required /></label>}
          <label>Email address<input name="email" type="email" placeholder="you@company.com" required /></label>
          <label>Password<input name="password" type="password" minLength={8} placeholder="At least 8 characters" required /></label>
          {error && <p className="form-error">{error}</p>}
          <button className="button button-primary auth-submit" disabled={busy}>{busy ? 'One moment…' : authMode === 'login' ? 'Sign in' : 'Create account'}<ArrowUpRight size={16} /></button>
          <p className="auth-switch">{authMode === 'login' ? 'New to Loopwork?' : 'Already have an account?'} <button type="button" onClick={() => { setError(''); setAuthMode(authMode === 'login' ? 'register' : 'login') }}>{authMode === 'login' ? 'Create account' : 'Sign in'}</button></p>
          {authMode === 'login' && <button className="demo-login" type="button" onClick={async () => {
            setBusy(true); setError('')
            try { const result = await request<{ token: string; user: User }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'demo@loopwork.app', password: 'demo1234' }) }); localStorage.setItem('loopwork-token', result.token); setToken(result.token); setUser(result.user) }
            catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not open demo.') }
            finally { setBusy(false) }
          }}>Explore the demo workspace <ArrowUpRight size={15} /></button>}
        </form>
        <span className="auth-footer">A thoughtful space for teams who care about the details.</span>
      </section>
    </main>
  )

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup"><span className="brand-mark"><LayoutGrid size={18} /></span><span>loopwork</span><button className="icon-button workspace-switch" title="Workspace menu"><ChevronDown size={15} /></button></div>
        <button className="workspace-chip"><span className="workspace-avatar">S</span><span><b>Studio North</b><small>Free workspace</small></span><ChevronDown size={14} /></button>
        <nav className="primary-nav" aria-label="Main navigation">
          <button className="nav-item"><Inbox size={17} />My work <span className="nav-count">3</span></button>
          <button className="nav-item"><Activity size={17} />Activity</button>
        </nav>
        <div className="sidebar-section"><div className="section-label">Your projects<button className="icon-button" title="Create project" onClick={() => { setError(''); setActiveModal('project') }}><Plus size={16} /></button></div>
          <div className="project-nav">{workspace.projects.map((project, index) => <button key={project.id} className={`project-link ${project.id === activeProjectId ? 'selected' : ''}`} onClick={() => setActiveProjectId(project.id)}><span className={`project-dot dot-${index % 4}`} />{project.name}<MoreHorizontal size={15} /></button>)}</div>
          <button className="add-project" onClick={() => { setError(''); setActiveModal('project') }}><Plus size={15} />Add a project</button>
        </div>
        <div className="sidebar-bottom"><button className="nav-item"><CircleHelp size={17} />Help & resources</button><button className="nav-item"><Settings2 size={17} />Settings</button><div className="profile-row"><span className="avatar avatar-you" style={{ backgroundColor: user.color }}>{initials(user.name)}</span><span className="profile-name"><b>{user.name}</b><small>{user.email}</small></span><button className="icon-button" title="Sign out" onClick={signOut}><LogOut size={16} /></button></div></div>
      </aside>

      <main className="main-area">
        <header className="topbar"><div className="breadcrumb"><span>Projects</span><span className="crumb-slash">/</span><strong>{activeProject?.name || 'Your workspace'}</strong></div><div className="top-actions"><label className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks" /><kbd>⌘ K</kbd></label><span className="top-divider" /><div className="notification-wrap"><button className="icon-button notification-button" title="Notifications" onClick={() => setShowNotifications((shown) => !shown)}><Bell size={18} />{unreadCount > 0 && <span className="notification-dot" />}</button>{showNotifications && <div className="notification-popover"><div className="popover-heading"><b>Notifications</b><span>{unreadCount} new</span></div>{workspace.notifications.length ? workspace.notifications.map((notification) => <button key={notification.id} className={`notification-item ${notification.read ? '' : 'unread'}`} onClick={() => { void markRead(notification.id); setShowNotifications(false) }}><span className="notification-icon"><MessageCircle size={15} /></span><span><b>{notification.message}</b><small>{notification.task_title || 'Project update'} · {relativeDate(notification.created_at)}</small></span>{!notification.read && <i />}</button>) : <div className="empty-notifications">Nothing new, you're all caught up.</div>}<button className="mark-read" onClick={() => workspace.notifications.filter((item) => !item.read).forEach((item) => void markRead(item.id))}><CheckCheck size={14} />Mark all as read</button></div>}</div><span className="avatar avatar-you top-avatar" style={{ backgroundColor: user.color }}>{initials(user.name)}</span></div></header>

        <section className="page-content">
          <div className="project-heading"><div className="project-heading-main"><div className="project-eyebrow"><span className="project-dot dot-0" />TEAM PROJECT <span className="heading-separator">·</span> UPDATED JUST NOW</div><h1>{activeProject?.name || 'Create your first project'}</h1><p>{activeProject?.description || 'Gather the team around the work that matters.'}</p></div><div className="heading-actions"><div className="avatar-stack">{workspace.users.slice(0, 4).map((member) => <span className="avatar" key={member.id} title={member.name} style={{ backgroundColor: member.color }}>{initials(member.name)}</span>)}</div><button className="button button-soft invite-button" onClick={() => { setError(''); setActiveModal('invite') }}><Users size={15} />Invite</button><button className="button button-primary" onClick={() => { setError(''); setActiveModal('task') }} disabled={!activeProject}><Plus size={16} />New task</button></div></div>

          <div className="view-toolbar"><div className="view-tabs"><button className={activeView === 'board' ? 'active' : ''} onClick={() => setActiveView('board')}><LayoutGrid size={15} />Board</button><button className={activeView === 'activity' ? 'active' : ''} onClick={() => setActiveView('activity')}><Activity size={15} />Activity</button></div><div className="board-tools"><span className="task-total">{projectTasks.length} tasks</span><span className="toolbar-divider" /><button className="tool-button" title="Sort by due date"><ListFilter size={15} /><span>Sort</span></button><button className="tool-button" title="Project options"><MoreHorizontal size={17} /></button></div></div>

          {error && <div className="inline-error" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss"><X size={15} /></button></div>}
          {activeView === 'board' ? <div className="board-grid">{columns.map((column) => {
            const tasks = projectTasks.filter((task) => task.status === column.id)
            return <section className="board-column" key={column.id} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { const taskId = Number(event.dataTransfer.getData('text/task')); if (taskId) void updateTask(taskId, { status: column.id }) }}>
              <div className="column-heading"><span className={`column-marker marker-${column.color}`} /><h2>{column.label}</h2><span className="column-count">{tasks.length}</span><button className="icon-button column-menu" title="Add task" onClick={() => setActiveModal('task')}><Plus size={16} /></button></div>
              <div className="task-list">{tasks.map((task) => <article className="task-card" key={task.id} draggable onDragStart={(event) => event.dataTransfer.setData('text/task', String(task.id))} onClick={() => { setSelectedTaskId(task.id); setActiveModal('detail') }}>
                <div className="task-card-top"><span className={`priority priority-${task.priority}`}><span />{capitalize(task.priority)}</span><button className="icon-button card-menu" title="Task options" onClick={(event) => { event.stopPropagation(); setSelectedTaskId(task.id); setActiveModal('detail') }}><MoreHorizontal size={16} /></button></div>
                <h3>{task.title}</h3>{task.description && <p className="task-description">{task.description}</p>}
                <div className="task-card-footer"><div className="task-meta">{task.due_date && <span className={`due-date ${isOverdue(task.due_date, task.status) ? 'overdue' : ''}`}><CalendarDays size={13} />{formatDate(task.due_date)}</span>}{task.comment_count > 0 && <span className="comment-count"><MessageCircle size={13} />{task.comment_count}</span>}</div>{task.assignee_name ? <span className="avatar task-assignee" title={task.assignee_name} style={{ backgroundColor: task.assignee_color }}>{initials(task.assignee_name)}</span> : <span className="unassigned-avatar" title="Unassigned">+</span>}</div>
              </article>)}{!tasks.length && <div className="empty-column">Drop a task here</div>}</div>
              <button className="column-add" onClick={() => setActiveModal('task')}><Plus size={15} />Add task</button>
            </section>
          })}</div> : <section className="activity-feed"><div className="activity-title"><span className="eyebrow">THE LATEST</span><h2>Team activity</h2><p>A running thread of the work as it moves along.</p></div>{workspace.comments.slice().reverse().map((comment) => <div className="activity-row" key={comment.id}><span className="avatar" style={{ backgroundColor: comment.user_color }}>{initials(comment.user_name)}</span><div><p><b>{comment.user_name}</b> commented on <b>{workspace.tasks.find((task) => task.id === comment.task_id)?.title || 'a task'}</b></p><span>“{comment.body}”</span><small>{relativeDate(comment.created_at)}</small></div></div>)}{!workspace.comments.length && <div className="empty-state">Conversations on tasks will show up here.</div>}</section>}
          <footer className="board-footer"><span><span className="live-dot" />Everything is up to date</span><span>Last synced just now <span className="footer-separator">·</span> <button onClick={() => void loadWorkspace()}>Refresh</button></span></footer>
        </section>
      </main>

      {activeModal && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveModal(null) }}><section className={`modal ${activeModal === 'detail' ? 'detail-modal' : ''}`} role="dialog" aria-modal="true">
        <header className="modal-header"><div><span className="eyebrow">{activeModal === 'project' ? 'MAKE SPACE FOR IT' : activeModal === 'task' ? 'MOVE THE WORK FORWARD' : activeModal === 'invite' ? 'BETTER TOGETHER' : 'TASK DETAILS'}</span><h2>{activeModal === 'project' ? 'Create a project' : activeModal === 'task' ? 'Add a task' : activeModal === 'invite' ? 'Invite a teammate' : selectedTask?.title}</h2></div><button className="icon-button" title="Close" onClick={() => setActiveModal(null)}><X size={18} /></button></header>
        {activeModal === 'project' && <form className="modal-form" onSubmit={createProject}><label>Project name<input name="name" placeholder="e.g. Website refresh" required autoFocus /></label><label>A short description<textarea name="description" placeholder="What's the team working toward?" rows={3} /></label>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="button button-quiet" onClick={() => setActiveModal(null)}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? 'Creating…' : 'Create project'}<ArrowUpRight size={15} /></button></div></form>}
        {activeModal === 'task' && <form className="modal-form" onSubmit={createTask}><label>Task name<input name="title" placeholder="What needs to get done?" required autoFocus /></label><label>Details<textarea name="description" placeholder="A little context goes a long way…" rows={3} /></label><div className="form-row"><label>Assignee<select name="assigneeId"><option value="">Unassigned</option>{workspace.users.map((member) => <option value={member.id} key={member.id}>{member.name}</option>)}</select></label><label>Due date<input name="dueDate" type="date" /></label></div><div className="form-row"><label>Priority<select name="priority" defaultValue="medium"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><label>Status<select name="status"><option value="todo">To do</option><option value="progress">In progress</option><option value="done">Done</option></select></label></div>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="button button-quiet" onClick={() => setActiveModal(null)}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? 'Adding…' : 'Add task'}<Plus size={15} /></button></div></form>}
        {activeModal === 'invite' && <form className="modal-form" onSubmit={inviteMember}><p className="modal-intro">Add someone from your workspace to <b>{activeProject?.name}</b>.</p><label>Teammate<select name="userId" required defaultValue=""><option value="" disabled>Choose a teammate</option>{workspace.users.filter((member) => member.id !== user.id).map((member) => <option key={member.id} value={member.id}>{member.name} · {member.email}</option>)}</select></label>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="button button-quiet" onClick={() => setActiveModal(null)}>Cancel</button><button className="button button-primary">Add to project<Users size={15} /></button></div></form>}
        {activeModal === 'detail' && selectedTask && <div className="task-detail"><div className="detail-selects"><label>Status<select value={selectedTask.status} onChange={(event) => void updateTask(selectedTask.id, { status: event.target.value })}>{columns.map((column) => <option key={column.id} value={column.id}>{column.label}</option>)}</select></label><label>Priority<select value={selectedTask.priority} onChange={(event) => void updateTask(selectedTask.id, { priority: event.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><label>Assignee<select value={selectedTask.assignee_id || ''} onChange={(event) => void updateTask(selectedTask.id, { assigneeId: event.target.value ? Number(event.target.value) : null })}><option value="">Unassigned</option>{workspace.users.map((member) => <option value={member.id} key={member.id}>{member.name}</option>)}</select></label></div><p className="detail-description">{selectedTask.description || 'No description yet.'}</p><div className="comments-heading"><h3>Conversation</h3><span>{projectComments.length}</span></div><div className="comment-list">{projectComments.map((comment) => <div className="comment-row" key={comment.id}><span className="avatar" style={{ backgroundColor: comment.user_color }}>{initials(comment.user_name)}</span><div><div className="comment-byline"><b>{comment.user_name}</b><small>{relativeDate(comment.created_at)}</small></div><p>{comment.body}</p></div></div>)}{!projectComments.length && <p className="no-comments">No comments yet. Start the conversation.</p>}</div><form className="comment-form" onSubmit={addComment}><textarea name="body" placeholder="Write a comment…" rows={2} required /><button className="button button-primary" title="Send comment"><ArrowUpRight size={16} /></button></form></div>}
      </section></div>}
    </div>
  )
}

function initials(name: string) { return name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase() }
function capitalize(value: string) { return value.charAt(0).toUpperCase() + value.slice(1) }
function formatDate(value: string) { return new Date(`${value}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
function isOverdue(value: string, status: string) { return status !== 'done' && new Date(`${value}T23:59:59`) < new Date() }
function relativeDate(value: string) {
  const date = new Date(`${value.replace(' ', 'T')}Z`)
  const days = Math.floor((Date.now() - date.getTime()) / 86400000)
  if (!Number.isFinite(days) || days < 1) return 'just now'
  return days === 1 ? 'yesterday' : `${days} days ago`
}

export default App
