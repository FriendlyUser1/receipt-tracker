# Receipt Tracker

## Environment files

- `app/.env` is for Vite-only frontend settings.
- `backend/.env` is for Node backend settings.

## Common scripts

- `npm run dev` runs the frontend and backend in development.
- `npm run start:frontend` builds the frontend and serves `app/dist` on port `8080`.
- `npm run start:backend` starts the Express server.
- `npm run start` runs both production-style servers together.

## Database path

`backend/database/db.js` accepts either an absolute `DB_PATH` or a path relative to the `backend/` folder.
