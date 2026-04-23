import { useState, useEffect } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { inviteStorage } from '@/lib/inviteStorage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import GoogleIcon from '@/components/icons/GoogleIcon';
import type { FamilyInvitation, Family } from '@/types/entities';

type Step = 'loading' | 'invalid' | 'form' | 'done';

export default function Invite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const { user } = useAuth();

  const [step, setStep] = useState<Step>('loading');
  const [invitation, setInvitation] = useState<FamilyInvitation | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      if (import.meta.env.DEV) console.warn('[Invite] no invite token found in URL params');
      setStep('invalid');
      return;
    }

    if (import.meta.env.DEV) console.log('[Invite] invite token found — starting invitation lookup', { token });

    supabase
      .from('family_invitations')
      .select('*, families(*)')
      .eq('token', token)
      .eq('status', 'pending')
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          if (import.meta.env.DEV) console.warn('[Invite] invitation lookup failed — token invalid or expired', { token });
          setStep('invalid');
          return;
        }
        const { families: fam, ...invite } = data;
        if (import.meta.env.DEV) console.log('[Invite] invitation lookup success', { inviteId: invite.id, role: invite.role, familyId: (fam as Family | null)?.id });
        setInvitation(invite as FamilyInvitation);
        setFamily(fam as Family);
        setStep('form');
      });
  }, [token]);

  // All hooks called above — safe to return conditionally now
  if (user) return <Navigate to="/Daily" replace />;

  const validateForm = () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter your first and last name.');
      return false;
    }
    return true;
  };

  const handleEmailJoin = async () => {
    if (!validateForm()) return;
    if (!password || password.length < 6) {
      if (import.meta.env.DEV) console.warn('[Invite] form validation failed — password too short');
      setError('Password must be at least 6 characters.');
      return;
    }
    if (import.meta.env.DEV) console.log('[Invite] auth method chosen: email/password', { email: invitation?.email });
    setError('');
    setLoading(true);
    inviteStorage.save(token, { firstName: firstName.trim(), lastName: lastName.trim() });
    if (import.meta.env.DEV) console.log('[Invite] profile creation on invite acceptance — signing up with email', { email: invitation?.email });
    const { error: err } = await supabase.auth.signUp({
      email: invitation!.email,
      password,
    });
    if (err) {
      if (import.meta.env.DEV) console.error('[Invite] email sign-up failed', { error: err });
      inviteStorage.clear();
      setError(err.message);
      setLoading(false);
      return;
    }
    if (import.meta.env.DEV) console.log('[Invite] email sign-up success — awaiting profile creation via AuthContext');
    setStep('done');
  };

  const handleGoogleJoin = () => {
    if (!validateForm()) return;
    if (import.meta.env.DEV) console.log('[Invite] auth method chosen: Google OAuth', { email: invitation?.email });
    setError('');
    inviteStorage.save(token, { firstName: firstName.trim(), lastName: lastName.trim() });
    if (import.meta.env.DEV) console.log('[Invite] profile creation on invite acceptance — redirecting to Google OAuth');
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    setStep('done');
  };

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (step === 'invalid') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-destructive">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h1 className="text-xl font-black text-foreground">Invalid or Expired Invite</h1>
          <p className="text-sm text-muted-foreground">This invite link is no longer valid. Ask your family admin for a new one.</p>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground">Setting up your account…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <svg width="32" height="32" viewBox="0 0 20 20" fill="none">
              <path d="M10 2C10 2 5 7 5 12C5 14.761 7.239 17 10 17C12.761 17 15 14.761 15 12C15 7 10 2 10 2Z" fill="url(#invite-flame)" />
              <circle cx="10" cy="12.5" r="2.5" fill="rgba(255,255,255,0.4)" />
              <defs>
                <linearGradient id="invite-flame" x1="10" y1="2" x2="10" y2="17" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#f97316" />
                  <stop offset="1" stopColor="#fde68a" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black text-foreground tracking-tight font-nunito">You're invited!</h1>
            {family && (
              <p className="text-sm text-muted-foreground mt-1">
                Join <span className="font-semibold text-foreground">{family.name}</span> as a{' '}
                <span className="font-semibold text-primary">{invitation?.role}</span>
              </p>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <p className="text-xs text-muted-foreground">
            Joining as <span className="font-semibold text-foreground">{invitation?.email}</span>
          </p>

          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="First name"
                className="h-10 rounded-xl"
                autoFocus
              />
              <Input
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="Last name"
                className="h-10 rounded-xl"
              />
            </div>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Create a password"
              className="h-10 rounded-xl"
              autoComplete="new-password"
              onKeyDown={e => e.key === 'Enter' && handleEmailJoin()}
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button
            onClick={handleEmailJoin}
            disabled={loading}
            className="w-full h-10 rounded-xl font-semibold"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Joining…
              </span>
            ) : 'Join with Email'}
          </Button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <Button
            onClick={handleGoogleJoin}
            variant="outline"
            className="w-full h-10 gap-3 text-sm font-semibold rounded-xl"
          >
            <GoogleIcon />
            Continue with Google
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          By continuing you agree to use this app as part of {family?.name ?? 'your family'}.
        </p>
      </div>
    </div>
  );
}
