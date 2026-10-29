# Northstar Supply

A responsive computer-accessories e-commerce internship project using Vite, HTML, CSS, vanilla JavaScript, Express, and a persistent JSON database.

## Run locally

```bash
npm install
npm start
```

Open http://localhost:3000.

For frontend development with Vite and API proxying, run the API and frontend in separate terminals:

```bash
npm run dev:server
npm run dev:client
```

Open http://localhost:5173.

Create a production frontend build with `npm run build`. Express serves the generated `dist` folder automatically when it exists.

The database is created and seeded automatically at `data/nestand.json` on first run. It stores users, products, and orders locally.

## Included flows

- Product listing with category filters and search
- Product detail view
- Persistent client-side cart
- User registration and login with hashed passwords and JWT sessions
- Checkout that stores orders against the signed-in user
- Authenticated checkout with stored order records
