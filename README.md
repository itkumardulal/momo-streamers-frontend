# Momo Streamer — Frontend

Next.js **15** (App Router) + **TypeScript** + **Tailwind CSS** + **shadcn/ui**, with **Redux Toolkit** and **RTK Query** for state and API calls.

## Requirements

- [Node.js](https://nodejs.org/) 20+ (LTS recommended)
- npm (bundled with Node)

## Setup

```bash
npm install
```

## Environment

Copy the example env file and adjust the API base URL if needed:

```bash
copy .env.local.example .env.local   # Windows
# cp .env.local.example .env.local   # macOS / Linux
```

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend base URL (default in code: `http://localhost:5159`) |

No trailing slash.

## Run (development)

```bash
npm run dev
```

The dev script binds **port 3000** (`next dev --turbopack -p 3000`). If the port is busy, stop the other process or change the port in `package.json`.

- App: **http://localhost:3000**
- Ensure the **API** is running and CORS allows your origin (Development allows all localhost ports).

## Production build

```bash
npm run build
npm start
```

## Project structure

| Path | Purpose |
|------|---------|
| `src/app` | Routes: `/login`, `/dashboard`, `/outlets`, `/users` |
| `src/features` | Redux slices (`auth`), RTK Query (`api`) |
| `src/entities` | Shared TypeScript types |
| `src/shared` | Layout shell, protected route wrapper |
| `src/components/ui` | shadcn components |
| `src/store` | Redux store and providers |

## Authentication

- **No public registration.** Users are created by a Super Admin via the API.
- JWT is stored in **`localStorage`** (MVP). RTK Query attaches `Authorization: Bearer <token>` automatically.
- **Sign out** is available from the sidebar, the header button, and the account dropdown (clears token, resets API cache, redirects to `/login`).

## Styling

Corporate **white & blue** theme (`#2563EB` primary). Components use Tailwind + shadcn design tokens in `src/app/globals.css`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server (Turbopack, port 3000) |
| `npm run build` | Production build |
| `npm start` | Serve production build |
| `npm run lint` | ESLint |

---

Point this app at a running **Momo Streamer API** backend. See `../momo-streamer-backend/README.md` for API setup.
