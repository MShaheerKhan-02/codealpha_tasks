# Loopwork Project Notes

- The frontend is React + TypeScript + Vite. Keep board interactions in the existing UI patterns and preserve responsive behavior.
- The API and Socket.IO server are in `server/index.js`; SQLite schema and demo seed data live there as well.
- Authenticated API requests use a bearer token. Keep project membership checks on all project/task/comment operations.
- Run `npm run build` after frontend changes and `node --check server/index.js` after API changes.
- Do not commit `.env` files or `server/loopwork.db`.