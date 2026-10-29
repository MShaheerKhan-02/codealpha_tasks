import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import http from 'node:http'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import initSqlJs from 'sql.js'
import { Server } from 'socket.io'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const root = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const SQL = await initSqlJs({ locateFile: () => require.resolve('sql.js/dist/sql-wasm.wasm') })
const database = new (class {
  constructor() {
    this.path = join(root, 'loopwork.db')
    this.handle = existsSync(this.path) ? new SQL.Database(readFileSync(this.path)) : new SQL.Database()
  }
  pragma() {}
  exec(sql) { this.handle.exec(sql); this.persist() }
  prepare(sql) {
    return {
      get: (...params) => this.query(sql, params, 'get'),
      all: (...params) => this.query(sql, params, 'all'),
      run: (...params) => this.run(sql, params),
    }
  }
  query(sql, params, mode) {
    const statement = this.handle.prepare(sql)
    try {
      statement.bind(params)
      if (mode === 'get') return statement.step() ? statement.getAsObject() : undefined
      const rows = []
      while (statement.step()) rows.push(statement.getAsObject())
      return rows
    } finally { statement.free() }
  }
  run(sql, params) {
    this.handle.run(sql, params)
    const result = { changes: this.handle.getRowsModified(), lastInsertRowid: this.handle.exec('SELECT last_insert_rowid() AS id')[0].values[0][0] }
    this.persist()
    return result
  }
  transaction(callback) {
    return () => {
      this.handle.run('BEGIN')
      try { const result = callback(); this.handle.run('COMMIT'); this.persist(); return result }
      catch (error) { this.handle.run('ROLLBACK'); throw error }
    }
  }
  persist() { writeFileSync(this.path, Buffer.from(this.handle.export())) }
})()

const secret = process.env.JWT_SECRET || 'local-development-secret-change-me'
const app = express()
const server = http.createServer(app)
const io = new Server(server, { cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173' } })
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }))
app.use(express.json())
app.get('/api/health', (_req, res) => res.json({ ok: true }))
database.pragma('foreign_keys = ON')
database.exec(`
  CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password TEXT NOT NULL, color TEXT NOT NULL DEFAULT '#dcece4');
  CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY, name TEXT NOT NULL, description TEXT DEFAULT '', color TEXT NOT NULL DEFAULT '#6b9b7c', owner_id INTEGER NOT NULL REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS project_members (project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY(project_id, user_id));
  CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY, project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE, title TEXT NOT NULL, description TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'todo', priority TEXT NOT NULL DEFAULT 'medium', assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL, due_date TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY, task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, body TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL, task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE, message TEXT NOT NULL, read INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
`)

if (!database.prepare('SELECT COUNT(*) AS count FROM users').get().count) {
  const addUser = database.prepare('INSERT INTO users (name, email, password, color) VALUES (?, ?, ?, ?)')
  const demo = addUser.run('Alex Morgan', 'demo@loopwork.app', bcrypt.hashSync('demo1234', 10), '#d9e8dc').lastInsertRowid
  const maya = addUser.run('Maya Chen', 'maya@loopwork.app', bcrypt.hashSync('demo1234', 10), '#f2dfd3').lastInsertRowid
  const noah = addUser.run('Noah Williams', 'noah@loopwork.app', bcrypt.hashSync('demo1234', 10), '#e6dff0').lastInsertRowid
  const project = database.prepare('INSERT INTO projects (name, description, color, owner_id) VALUES (?, ?, ?, ?)').run('Atlas rebrand', 'A clearer story for a new chapter.', '#739a79', demo).lastInsertRowid
  database.prepare('INSERT INTO project_members (project_id, user_id) VALUES (?, ?)').run(project, demo)
  database.prepare('INSERT INTO project_members (project_id, user_id) VALUES (?, ?)').run(project, maya)
  database.prepare('INSERT INTO project_members (project_id, user_id) VALUES (?, ?)').run(project, noah)
  const addTask = database.prepare('INSERT INTO tasks (project_id, title, description, status, priority, assignee_id, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)')
  addTask.run(project, 'Map the current brand landscape', 'Collect references and spot the whitespace.', 'done', 'low', maya, '2026-10-23')
  addTask.run(project, 'Explore visual directions', 'Bring three distinct routes to the team.', 'progress', 'high', demo, '2026-10-30')
  addTask.run(project, 'Write the new brand story', 'Find the words that make the shift feel real.', 'progress', 'medium', noah, '2026-11-02')
  addTask.run(project, 'Build the launch toolkit', 'Templates, guidelines, and all the useful bits.', 'todo', 'medium', maya, '2026-11-08')
  addTask.run(project, 'Share the work with the team', 'Walk everyone through the new direction.', 'todo', 'low', null, '2026-11-12')
}

const userById = database.prepare('SELECT id, name, email, color FROM users WHERE id = ?')
const signToken = (user) => jwt.sign({ id: user.id }, secret, { expiresIn: '7d' })
const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
    req.user = userById.get(jwt.verify(token, secret).id)
    if (!req.user) return res.status(401).json({ error: 'Your session has expired.' })
    next()
  } catch { res.status(401).json({ error: 'Please sign in to continue.' }) }
}

app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body
  if (!name?.trim() || !email?.trim() || !password || password.length < 8) return res.status(400).json({ error: 'Add your name, email, and a password of at least 8 characters.' })
  try {
    const result = database.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)').run(name.trim(), email.toLowerCase(), bcrypt.hashSync(password, 10))
    const user = userById.get(result.lastInsertRowid)
    res.status(201).json({ token: signToken(user), user })
  } catch { res.status(409).json({ error: 'An account with that email already exists.' }) }
})

app.post('/api/auth/login', (req, res) => {
  const user = database.prepare('SELECT * FROM users WHERE email = ?').get(req.body.email?.toLowerCase())
  if (!user || !bcrypt.compareSync(req.body.password || '', user.password)) return res.status(401).json({ error: 'That email and password do not match.' })
  const profile = userById.get(user.id)
  res.json({ token: signToken(profile), user: profile })
})
app.get('/api/auth/me', auth, (req, res) => res.json(req.user))

app.get('/api/workspace', auth, (req, res) => {
  const projects = database.prepare('SELECT p.* FROM projects p JOIN project_members m ON m.project_id = p.id WHERE m.user_id = ? ORDER BY p.created_at DESC').all(req.user.id)
  const projectIds = projects.map((project) => project.id)
  const users = database.prepare('SELECT id, name, email, color FROM users ORDER BY name').all()
  const tasks = projectIds.length ? database.prepare(`SELECT t.*, u.name AS assignee_name, u.color AS assignee_color, (SELECT COUNT(*) FROM comments c WHERE c.task_id = t.id) AS comment_count FROM tasks t LEFT JOIN users u ON u.id = t.assignee_id WHERE t.project_id IN (${projectIds.map(() => '?').join(',')}) ORDER BY t.created_at DESC`).all(...projectIds) : []
  const comments = projectIds.length ? database.prepare(`SELECT c.*, u.name AS user_name, u.color AS user_color FROM comments c JOIN users u ON u.id = c.user_id JOIN tasks t ON t.id = c.task_id WHERE t.project_id IN (${projectIds.map(() => '?').join(',')}) ORDER BY c.created_at ASC`).all(...projectIds) : []
  const notifications = database.prepare('SELECT n.*, u.name AS actor_name, t.title AS task_title FROM notifications n LEFT JOIN users u ON u.id = n.actor_id LEFT JOIN tasks t ON t.id = n.task_id WHERE n.user_id = ? ORDER BY n.created_at DESC LIMIT 20').all(req.user.id)
  res.json({ projects, tasks, users, comments, notifications })
})

app.post('/api/projects', auth, (req, res) => {
  const name = req.body.name?.trim()
  if (!name) return res.status(400).json({ error: 'Project name is required.' })
  const create = database.transaction(() => {
    const id = database.prepare('INSERT INTO projects (name, description, owner_id) VALUES (?, ?, ?)').run(name, req.body.description || '', req.user.id).lastInsertRowid
    database.prepare('INSERT INTO project_members (project_id, user_id) VALUES (?, ?)').run(id, req.user.id)
    return database.prepare('SELECT * FROM projects WHERE id = ?').get(id)
  })
  const project = create()
  io.emit('workspace:updated')
  res.status(201).json(project)
})

app.post('/api/projects/:id/members', auth, (req, res) => {
  const project = database.prepare('SELECT id FROM projects WHERE id = ? AND owner_id = ?').get(req.params.id, req.user.id)
  if (!project) return res.status(404).json({ error: 'Project not found.' })
  const member = userById.get(req.body.userId)
  if (!member) return res.status(404).json({ error: 'Teammate not found.' })
  database.prepare('INSERT OR IGNORE INTO project_members (project_id, user_id) VALUES (?, ?)').run(project.id, member.id)
  io.emit('workspace:updated')
  res.json({ ok: true })
})

app.post('/api/tasks', auth, (req, res) => {
  const { projectId, title, description = '', status = 'todo', priority = 'medium', assigneeId = null, dueDate = null } = req.body
  const member = database.prepare('SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, req.user.id)
  if (!member) return res.status(404).json({ error: 'Project not found.' })
  if (!title?.trim()) return res.status(400).json({ error: 'Task title is required.' })
  if (assigneeId && !database.prepare('SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, assigneeId)) return res.status(400).json({ error: 'Assign this task to a project member.' })
  const id = database.prepare('INSERT INTO tasks (project_id, title, description, status, priority, assignee_id, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)').run(projectId, title.trim(), description, status, priority, assigneeId || null, dueDate || null).lastInsertRowid
  if (assigneeId && assigneeId !== req.user.id) notify(assigneeId, req.user.id, id, `${req.user.name} assigned you a task`)
  io.emit('workspace:updated')
  res.status(201).json(database.prepare('SELECT * FROM tasks WHERE id = ?').get(id))
})

app.patch('/api/tasks/:id', auth, (req, res) => {
  const task = database.prepare('SELECT t.* FROM tasks t JOIN project_members m ON m.project_id = t.project_id WHERE t.id = ? AND m.user_id = ?').get(req.params.id, req.user.id)
  if (!task) return res.status(404).json({ error: 'Task not found.' })
  const aliases = { assigneeId: 'assignee_id', dueDate: 'due_date' }
  const allowed = ['title', 'description', 'status', 'priority', 'assignee_id', 'due_date']
  const changes = Object.entries(req.body).map(([key, value]) => [aliases[key] || key, value]).filter(([key]) => allowed.includes(key))
  const assignee = req.body.assigneeId ?? req.body.assignee_id
  if (assignee && !database.prepare('SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?').get(task.project_id, assignee)) return res.status(400).json({ error: 'Assign this task to a project member.' })
  if (changes.length) database.prepare(`UPDATE tasks SET ${changes.map(([key]) => `${key} = ?`).join(', ')} WHERE id = ?`).run(...changes.map(([, value]) => value ?? null), task.id)
  if (assignee && assignee !== task.assignee_id && assignee !== req.user.id) notify(assignee, req.user.id, task.id, `${req.user.name} assigned you a task`)
  io.emit('workspace:updated')
  res.json(database.prepare('SELECT * FROM tasks WHERE id = ?').get(task.id))
})

function notify(userId, actorId, taskId, message) {
  const result = database.prepare('INSERT INTO notifications (user_id, actor_id, task_id, message) VALUES (?, ?, ?, ?)').run(userId, actorId, taskId, message)
  io.to(`user:${userId}`).emit('notification:new', database.prepare('SELECT * FROM notifications WHERE id = ?').get(result.lastInsertRowid))
}

app.post('/api/tasks/:id/comments', auth, (req, res) => {
  const task = database.prepare('SELECT t.* FROM tasks t JOIN project_members m ON m.project_id = t.project_id WHERE t.id = ? AND m.user_id = ?').get(req.params.id, req.user.id)
  const body = req.body.body?.trim()
  if (!task) return res.status(404).json({ error: 'Task not found.' })
  if (!body) return res.status(400).json({ error: 'Write a comment first.' })
  const id = database.prepare('INSERT INTO comments (task_id, user_id, body) VALUES (?, ?, ?)').run(task.id, req.user.id, body).lastInsertRowid
  const comment = database.prepare('SELECT c.*, u.name AS user_name, u.color AS user_color FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?').get(id)
  if (task.assignee_id && task.assignee_id !== req.user.id) notify(task.assignee_id, req.user.id, task.id, `${req.user.name} commented on your task`)
  io.emit('workspace:updated')
  res.status(201).json(comment)
})

app.patch('/api/notifications/:id/read', auth, (req, res) => {
  database.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id)
  res.json({ ok: true })
})

io.use((socket, next) => {
  try { socket.data.user = jwt.verify(socket.handshake.auth?.token, secret); next() }
  catch { next(new Error('Unauthorized')) }
})
io.on('connection', (socket) => socket.join(`user:${socket.data.user.id}`))

const port = Number(process.env.PORT || 3001)
server.listen(port, () => console.log(`Loopwork API listening on http://localhost:${port}`))
