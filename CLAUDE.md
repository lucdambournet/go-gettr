# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # TypeScript compile + Vite production build
npm run typecheck    # Type-check without emitting
npm run lint         # ESLint (quiet — errors only)
npm run lint:fix     # ESLint with auto-fix
npm test             # Unit tests (Vitest, jsdom)
npx playwright test                         # Run all e2e tests (auto-starts dev server)
npx playwright test tests/home.spec.ts      # Run a single e2e test file
npx playwright test --ui                    # Interactive e2e test runner
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

**Auth flow (`src/lib/AuthContext.tsx`):** `AuthProvider` wraps the entire app and subscribes to Supabase auth state via `onAuthStateChange`. `useAuth()` exposes `{ user, profile, family, isParent, isLoadingAuth, isLoadingProfile, authError, signOut, refreshProfile }`. On sign-in, it fetches the user's profile and family in a single JOIN query (`profiles.select('*, families(*)')`). Auth errors are either `auth_required` (redirects to `/login`) or `user_not_registered` (shows error component).

**Routing (`src/App.tsx`):** Three-tier gating — `/login` and `/invite` are fully public. `/*` renders `AuthenticatedApp`, which blocks on auth/profile loading, then either gates to `/family/setup` (authenticated but no profile) or renders `AppLayout` (sidebar + `<Outlet>`) for all protected routes. Default route redirects to `/Daily`.

**Data layer (`src/api/entities.ts`):** `makeEntity(tableName)` is a factory that generates typed CRUD helpers (`list`, `filter`, `create`, `update`, `delete`) around the Supabase client. The `Profile` entity extends this with computed fields (`name`, `is_parent`). All pages use `entities.*` — not raw Supabase calls — plus two RPC helpers: `searchProfileByEmail` and `addProfileToFamily`. The Supabase singleton lives in `src/lib/supabase.ts`.

**Data fetching:** TanStack Query with `queryClientInstance` (`src/lib/query-client.ts`). Default staleTime is 5 minutes, no window-focus refetch. Pages use optimistic updates for chore toggles (see `Daily.tsx` — local `optimistic` state overlaid on top of the server `logMap`).

**Domain model (`src/types/entities.ts`):** Core types are `Profile` (role: `'parent' | 'child'`), `Family`, `FamilyInvitation`, `Chore`, `ChoreLog`, `Streak`, `Payout`, `Notification`, `Achievement`. Supabase tables: `profiles`, `families`, `family_invitations`, `chore`, `chore_log`, `streak`, `payout`, `notification`, `achievement`. RLS is enabled on all tables; parents can update other family members' profiles.

**Family setup flow (`src/pages/FamilySetup.tsx`):** When an authenticated user has no profile they are gated to `/family/setup`. The wizard draft is persisted to `sessionStorage` via `src/lib/familySetupDraft.ts` (key: `family-setup-draft-v1`). On completion `createFamilyFromDraft` (`src/lib/familySetupSave.ts`) creates the family, parent profile, optional spouse invitation, and child profiles/invitations in sequence.

**Invite flow (`src/lib/inviteStorage.ts` + `AuthContext`):** The `/invite` page saves the token + display name to `sessionStorage` before triggering Google OAuth. After redirect, `AuthContext.loadProfile` detects a pending invite token, creates the profile automatically, and clears the token.

**E2E mock auth (`src/lib/e2eAuth.ts`):** When `VITE_E2E_MOCK_AUTH=true`, `AuthContext` reads auth state from `sessionStorage` (key: `gogettr-e2e-auth`) instead of hitting Supabase. The Playwright config sets this flag automatically when starting the dev server (`VITE_E2E_MOCK_AUTH=true npm run dev`), so e2e tests never require real credentials.

**Layout (`src/components/layout/AppLayout.tsx`):** Animated sidebar (Framer Motion) that collapses to icon-only mode. Nav items use custom SVG icon components (active/inactive states). Sidebar shifts main content via `marginLeft` animation. Mobile uses a full-screen overlay drawer.

**Theme:** CSS variables driven. `Settings.tsx` lets users modify theme tokens at runtime; `src/lib/applyStoredTheme.ts` restores them on load.

**App manifest:** `useAppManifest` reads `VITE_APP_NAME` / `VITE_APP_ICON` env vars; used in `AppLayout` header/logo.

## Pages

| Route | File | Notes |
|---|---|---|
| `/` | `src/pages/Landing.tsx` | Public marketing landing page; login slide panel built-in |
| `/login` | `src/pages/Login.tsx` | Standalone auth page (kept for direct link compat) |
| `/invite` | `src/pages/Invite.tsx` | Invite token capture → OAuth redirect |
| `/family/setup` | `src/pages/FamilySetup.tsx` | 4-step wizard (parent → family → spouse → kids → chores) |
| `/Dashboard` | `src/pages/Dashboard.tsx` | Stats, streak leaderboard, achievements summary |
| `/Daily` | `src/pages/Daily.tsx` | Today's chore checklist with optimistic toggle |
| `/People` | `src/pages/People.tsx` | Family member CRUD |
| `/Chores` | `src/pages/Chores.tsx` | Chore management (title, icon, frequency, payout) |
| `/WeeklyView` | `src/pages/WeeklyView.tsx` | Week-long completion grid |
| `/CheckIn` | `src/pages/CheckIn.tsx` | Streak check-in + reward multiplier display |
| `/Bank` | `src/pages/Bank.tsx` | Payout management with visual money display |
| `/Notifications` | `src/pages/Notifications.tsx` | Notification history |
| `/Settings` | `src/pages/Settings.tsx` | Theme token editor + preferences |
| `/DevPanel` | `src/pages/DevPanel.tsx` | Internal dev tooling |

## Feature map

- **Daily Tasks** — per-person chore checklist, real-time progress bar, optimistic completion toggles
- **Streaks** — daily check-in, current/longest streak, reward multiplier (0.25 × 1.5^(streak−1))
- **Family Bank / Payouts** — per-chore payout rates, pending balance, parent-approved payouts
- **Achievements** — client-computed badges (First Step, On a Roll, Week Warrior, Unstoppable, Legendary, Chore Champion, Perfect Week, Team Effort, Earner)
- **Weekly View** — 7-day grid by person, completion % per day
- **People** — parent/child role management, avatar colors, invite by email
- **Chores** — title, description, icon (picker), frequency (daily/weekly/twice_daily/custom days), payout
- **Notifications** — chore_completed, payout_approved, streak_broken, achievement_unlocked events
- **Settings** — live CSS variable editing, dark mode, theme persistence

## Domain model (Supabase tables)

`profiles` · `families` · `family_invitations` · `chore` · `chore_log` · `streak` · `payout` · `notification` · `achievement`

Profile roles: `parent | child`. RLS enabled on all tables; parents can manage other family members.

## Design tokens

- **Primary:** indigo `hsl(245 58% 51%)`
- **Accent:** amber `hsl(33 90% 55%)`
- **Background:** light blue-gray `hsl(225 20% 97%)`
- **Fonts:** Inter (body), Nunito (headings, `font-nunito`), Syne (display, `font-syne`)
