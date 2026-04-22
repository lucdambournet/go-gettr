import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { inviteStorage } from '@/lib/inviteStorage';
import { clearE2EAuthState, isE2EMockAuthEnabled, readE2EAuthState } from '@/lib/e2eAuth';
import type { Profile, Family } from '@/types/entities';

interface AuthError {
  type: 'auth_required' | 'user_not_registered';
}

interface AuthContextValue {
  isLoadingAuth: boolean;
  isLoadingProfile: boolean;
  isLoadingPublicSettings: boolean;
  authError: AuthError | null;
  user: User | null;
  profile: Profile | null;
  family: Family | null;
  isParent: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [authError, setAuthError] = useState<AuthError | null>(null);

  const loadProfile = useCallback(async (authUser: User) => {
    if (import.meta.env.DEV) console.log('[auth] profile load start', { userId: authUser.id, email: authUser.email });
    setIsLoadingProfile(true);
    try {
      // Fetch profile + family in a single query via JOIN
      const { data } = await supabase
        .from('profiles')
        .select('*, families(*)')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

      if (data) {
        const { families: familyData, ...profileData } = data;
        setProfile(profileData as Profile);
        setFamily((familyData as Family) || null);
        if (import.meta.env.DEV) console.log('[auth] profile load success', { userId: authUser.id, profileId: profileData.id, familyId: (familyData as Family | null)?.id });
        return;
      }

      // No profile — check for a pending invite token saved before OAuth redirect
      const pending = inviteStorage.get();
      if (pending) {
        if (import.meta.env.DEV) console.log('[auth] pending invite token detected', { token: pending.token });
        const { data: invite } = await supabase
          .from('family_invitations')
          .select('*')
          .eq('token', pending.token)
          .eq('status', 'pending')
          .maybeSingle();

        if (invite) {
          if (import.meta.env.DEV) console.log('[auth] invite acceptance flow start', { inviteId: invite.id, role: invite.role, familyId: invite.family_id });
          // INSERT profile, UPDATE invitation, and fetch family all in parallel
          const [insertResult, , familyResult] = await Promise.all([
            supabase
              .from('profiles')
              .insert({
                auth_user_id: authUser.id,
                first_name: pending.firstName,
                last_name: pending.lastName,
                email: authUser.email ?? invite.email,
                role: invite.role,
                family_id: invite.family_id,
              })
              .select()
              .single(),
            supabase
              .from('family_invitations')
              .update({ status: 'accepted' })
              .eq('id', invite.id),
            supabase
              .from('families')
              .select('*')
              .eq('id', invite.family_id)
              .maybeSingle(),
          ]);

          inviteStorage.clear();

          if (insertResult.data) {
            setProfile(insertResult.data as Profile);
            setFamily((familyResult.data as Family) || null);
            if (import.meta.env.DEV) console.log('[auth] invite acceptance flow end — profile created', { profileId: insertResult.data.id });
          }
        } else {
          // Token invalid or expired
          if (import.meta.env.DEV) console.warn('[auth] pending invite token invalid or expired', { token: pending.token });
          inviteStorage.clear();
        }
      }
      // If still no profile, App.tsx redirects to /family/setup
    } catch (error) {
      if (import.meta.env.DEV) console.error('[auth] profile load failed', { error });
      throw error;
    } finally {
      setIsLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    if (isE2EMockAuthEnabled()) {
      const state = readE2EAuthState();

      setUser(state?.user ? (state.user as User) : null);
      setProfile(state?.profile ?? null);
      setFamily(state?.family ?? null);
      setAuthError(state?.user ? null : { type: 'auth_required' });
      setIsLoadingAuth(false);
      setIsLoadingProfile(false);
      return;
    }

    // onAuthStateChange fires immediately with the current session (INITIAL_SESSION),
    // so getSession() is not needed and would cause a redundant loadProfile call.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        if (import.meta.env.DEV) console.log('[auth] user signed in', { event: _event, userId: session.user.id, email: session.user.email });
        setUser(session.user);
        setAuthError(null);
        loadProfile(session.user);
      } else {
        if (import.meta.env.DEV) console.log('[auth] user signed out', { event: _event });
        setUser(null);
        setProfile(null);
        setFamily(null);
        setAuthError({ type: 'auth_required' });
      }
      setIsLoadingAuth(false);
    });
    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const signOut = async () => {
    if (import.meta.env.DEV) console.log('[auth] signOut() called');
    if (isE2EMockAuthEnabled()) {
      clearE2EAuthState();
      setUser(null);
      setProfile(null);
      setFamily(null);
      setAuthError({ type: 'auth_required' });
      return;
    }

    await supabase.auth.signOut();
  };

  const refreshProfile = useCallback(async () => {
    if (import.meta.env.DEV) console.log('[auth] refreshProfile() called', { userId: user?.id });
    if (isE2EMockAuthEnabled()) {
      const state = readE2EAuthState();
      setUser(state?.user ? (state.user as User) : null);
      setProfile(state?.profile ?? null);
      setFamily(state?.family ?? null);
      setAuthError(state?.user ? null : { type: 'auth_required' });
      return;
    }

    if (user) await loadProfile(user);
  }, [user, loadProfile]);

  return (
    <AuthContext.Provider value={{
      isLoadingAuth,
      isLoadingProfile,
      isLoadingPublicSettings: false,
      authError,
      user,
      profile,
      family,
      isParent: profile?.role === 'parent',
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
