# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # TypeScript compile + Vite production build
npm run typecheck    # Type-check without emitting
npm run lint         # ESLint (quiet — errors only)
npm run lint:fix     # ESLint with auto-fix
npx playwright test                         # Run all e2e tests
npx playwright test tests/home.spec.ts      # Run a single test file
npx playwright test --ui                    # Interactive test runner
```

## Environment setup

Create `.env.local` with:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_APP_NAME=GoGettr        # optional — falls back to "GoGettr"
VITE_APP_ICON=               # optional — URL to app icon
```

## Architecture

**Stack:** React 18 + TypeScript, Vite, Tailwind CSS, shadcn/ui (Radix primitives), Framer Motion, TanStack Query, React Router v6, Supabase (auth + database).

**Auth flow (`src/lib/AuthContext.tsx`):** `AuthProvider` wraps the entire app and subscribes to Supabase auth state. `useAuth()` exposes `{ user, isLoadingAuth, authError, signOut }`. Auth errors are either `auth_required` (redirects to `/login`) or `user_not_registered` (shows error component). The `/login` route lives outside `AuthenticatedApp` so it's accessible without a session.

**Routing (`src/App.tsx`):** Two-tier router — `/login` is public, `/*` renders `AuthenticatedApp` which handles auth gating then renders `AppLayout` (sidebar + `<Outlet>`) wrapping all protected routes. Default route redirects to `/Daily`.

**Data fetching:** TanStack Query with a shared `queryClientInstance` (`src/lib/query-client.ts`). Default staleTime is 5 minutes, no window-focus refetch.

**Supabase client:** Singleton in `src/lib/supabase.ts`, imported throughout. All DB access goes through this client directly (no separate API layer).

**Layout (`src/components/layout/AppLayout.tsx`):** Animated sidebar (Framer Motion) that collapses to icon-only mode. Nav items are defined as a static array with custom SVG icon components. The sidebar shifts main content via `marginLeft` animation. Mobile uses a full-screen overlay drawer triggered from a top header bar.

**Theme:** CSS variables driven. `Settings.tsx` lets users modify theme tokens at runtime; `src/lib/applyStoredTheme.ts` restores them on load.

**App manifest:** `useAppManifest` reads `VITE_APP_NAME` / `VITE_APP_ICON` env vars to brand the app; used in `AppLayout` header/logo.

**E2e tests:** Playwright in `tests/`, targets `http://localhost:5173`. Start the dev server separately before running tests.
