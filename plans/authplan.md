# Plan: Google OAuth Login (Supabase)

## Context
- Supabase client already configured in `src/lib/supabase.ts` with real env vars
- `AuthContext.tsx` is a stub with no real logic
- `ProtectedRoute.tsx` is an empty file (unused by App.tsx - not needed for this plan)
- `App.tsx` already handles `authError.type === 'auth_required'` and `user_not_registered` — we just need to wire up real logic
- Access: any Google account allowed (no whitelist)
- Sign-out: Settings page + AppLayout/sidebar

## Steps

### Phase 1: Supabase Dashboard (manual, prerequisite)
1. In Supabase dashboard → Authentication → Providers → enable Google, add Client ID + Secret
2. In Supabase Auth Settings → add redirect URLs: `http://localhost:5173` (dev) and production URL

### Phase 2: AuthContext implementation
3. Extend `AuthContextValue` type: change `authError: null` to `authError: { type: 'auth_required' | 'user_not_registered' } | null`; add `user: User | null` and `signOut: () => Promise<void>`
4. In `AuthProvider`: call `supabase.auth.getSession()` on mount to get initial session, set `isLoadingAuth: true` while pending; subscribe to `supabase.auth.onAuthStateChange()` for SIGNED_IN/SIGNED_OUT events; when no session set `authError = { type: 'auth_required' }`, when session exists clear authError and set user; cleanup subscription on unmount

### Phase 3: Login page
5. Create `src/pages/Login.tsx`: centered card with app branding + "Sign in with Google" button; button calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })`; if user already authenticated, render `<Navigate to="/Daily" replace />`; use existing shadcn Button component

### Phase 4: App.tsx routing updates
6. Add `/login` route in `App.tsx` (outside the `AppLayout` route group, but inside the Router)
7. Change the `auth_required` branch in `AuthenticatedApp` from calling `navigateToLogin()` to returning `<Navigate to="/login" replace />`; remove `navigateToLogin` from context or keep as no-op

### Phase 5: Sign-out
8. In `src/components/layout/AppLayout.tsx`: add a sign-out button (e.g., in sidebar footer area) that calls `signOut()` from `useAuth()`
9. In `src/pages/Settings.tsx`: add a "Sign Out" section/button that calls `signOut()` from `useAuth()`

## Files
- `src/lib/AuthContext.tsx` — full rewrite with real Supabase auth logic
- `src/pages/Login.tsx` — new file
- `src/App.tsx` — add /login route, fix auth_required handler
- `src/components/layout/AppLayout.tsx` — add sign-out
- `src/pages/Settings.tsx` — add sign-out

## Verification
1. `npm run dev` — app loads and redirects to /login when unauthenticated
2. Click "Sign in with Google" → Google OAuth flow completes → redirected to /Daily
3. Reload page → still authenticated (session persisted)
4. Sign out from Settings → redirected to /login
5. Sign out from AppLayout → redirected to /login
6. Navigate to /login when already authenticated → redirected to /Daily

## Decisions
- Any Google account may sign in (no whitelist / `user_not_registered` won't trigger)
- `navigateToLogin` replaced by `<Navigate>` in App.tsx (cleaner, no window.location hacks)
- AuthProvider stays outside Router (no restructuring needed)
