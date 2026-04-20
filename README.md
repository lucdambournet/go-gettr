# GoGettr

A family chore and task management app. Assign chores, track weekly progress, and manage your family — all in one place.

## Stack

- **Frontend:** React 18 + TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion
- **Data:** TanStack Query, React Router v6
- **Backend:** Supabase (auth + Postgres database)

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local  # then fill in your values
```

`.env.local` variables:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_APP_NAME=GoGettr        # optional
VITE_APP_ICON=               # optional — URL to app icon
```

```bash
# 3. Start the dev server
npm run dev   # http://localhost:5173
```

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Type-check + production build |
| `npm run typecheck` | Type-check without emitting |
| `npm run lint` | ESLint (errors only) |
| `npm run lint:fix` | ESLint with auto-fix |
| `npx playwright test` | Run all e2e tests |
| `npx playwright test --ui` | Interactive test runner |

> E2e tests target `http://localhost:5173` — start the dev server first.

## Features

- Google authentication via Supabase Auth
- Family setup: create a family, invite parents and children via email or invite link
- Weekly chore view with assignment and completion tracking
- Animated sidebar layout with mobile drawer support
- Runtime theme customisation via Settings
