import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { inviteStorage } from '@/lib/inviteStorage';
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
        return;
      }

      // No profile — check for a pending invite token saved before OAuth redirect
      const pending = inviteStorage.get();
      if (pending) {
        const { data: invite } = await supabase
          .from('family_invitations')
          .select('*')
          .eq('token', pending.token)
          .eq('status', 'pending')
          .maybeSingle();

        if (invite) {
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
          }
        } else {
          // Token invalid or expired
          inviteStorage.clear();
        }
      }
      // If still no profile, App.tsx redirects to /family/setup
    } finally {
      setIsLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    // onAuthStateChange fires immediately with the current session (INITIAL_SESSION),
    // so getSession() is not needed and would cause a redundant loadProfile call.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setAuthError(null);
        loadProfile(session.user);
      } else {
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
    await supabase.auth.signOut();
  };

  const refreshProfile = useCallback(async () => {
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
