# Loopwork

A collaborative project board for teams. Loopwork includes account registration and sign-in, project membership, kanban task boards, task assignment and priorities, due dates, threaded task comments, notifications, and live workspace updates.

## Requirements

- Node.js 20.19+ or 22.12+
- npm

## Run locally

```powershell
npm install
npm run dev:all
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173`). The API and Socket.IO server listens on `http://localhost:3001`. SQLite creates `server/loopwork.db` on first run and seeds a demo workspace.

Demo account:

- Email: `demo@loopwork.app`
- Password: `demo1234`

The login screen also has an **Explore the demo workspace** shortcut. The demo workspace includes Maya Chen and Noah Williams as teammates.

## Features

- Register and sign in with passwords hashed using bcrypt and JWT-backed sessions.
- Create projects, add existing workspace teammates, and create task cards.
- Assign tasks, set status, priority, and due date, and drag cards between board columns.
- Open a task to change its details and discuss it with comments.
- Receive in-app notifications for assignments and comments on assigned work.
- Receive Socket.IO events for workspace changes and notifications.

## Configuration

The defaults work locally. Optional environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3001` | API and WebSocket port |
| `JWT_SECRET` | local development value | Secret used to sign sessions; set a strong random value outside local development |
| `CLIENT_URL` | `http://localhost:5173` | Allowed browser origin for API and Socket.IO |
| `VITE_API_URL` | `http://localhost:3001` | API URL used by the browser |

Create a `.env` file in the project root to set server values. Set `VITE_API_URL` in the same root `.env` for a non-default client URL. Keep secrets out of source control.

## Commands

- `npm run dev:all` starts the API and Vite development server together.
- `npm run server` starts only the API and WebSocket server.
- `npm run dev` starts only the frontend.
- `npm run build` runs the TypeScript checks and creates a production frontend bundle in `dist/`.
- `npm run lint` runs Oxlint.

The SQLite database is local application data and should be backed up before removal. This starter is intended for local development; production deployment should use a strong `JWT_SECRET`, HTTPS, and an appropriately managed database and secret store.