import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { isE2EMockAuthEnabled, writeE2EAuthState } from '@/lib/e2eAuth';
import { supabase } from '@/lib/supabase';
import { buildInternalAuthEmail } from '@/lib/familySetupAuth';
import {
  createEmptyFamilySetupDraft,
  readFamilySetupDraft,
  writeFamilySetupDraft,
} from '@/lib/familySetupDraft';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import GoogleIcon from '@/components/icons/GoogleIcon';

type Mode = 'signin' | 'signup';

export default function Login() {
  const { user, profile } = useAuth();
  const [mode, setMode] = useState<Mode>('signup');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to={profile ? '/Daily' : '/family/setup'} replace />;
  }

  const seedDraft = (nextMode: 'google' | 'username') => {
    const existingDraft = readFamilySetupDraft() ?? createEmptyFamilySetupDraft({ childCount: 0 });
    writeFamilySetupDraft({
      ...existingDraft,
      parentAuth: {
        mode: nextMode,
        username: username.trim(),
      },
    });
  };

  const handleGoogleSignIn = () => {
    seedDraft('google');

    if (isE2EMockAuthEnabled()) {
      writeE2EAuthState({
        user: {
          id: 'e2e-parent-auth-user',
          email: 'parent@example.com',
        },
        profile: null,
        family: null,
      });
      window.location.assign('/family/setup');
      return;
    }

    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/family/setup` },
    });
  };

  const handleUsernameSubmit = async () => {
    setError('');

    if (!username.trim()) {
      setError('Enter a username.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    seedDraft('username');

    try {
      const authEmail = buildInternalAuthEmail(username);

      if (isE2EMockAuthEnabled()) {
        writeE2EAuthState({
          user: {
            id: 'e2e-parent-auth-user',
            email: authEmail,
          },
          profile: null,
          family: null,
        });
        window.location.assign('/family/setup');
        return;
      }

      if (mode === 'signin') {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password,
        });

        if (authError) {
          throw authError;
        }
      } else {
        const { error: authError } = await supabase.auth.signUp({
          email: authEmail,
          password,
        });

        if (authError) {
          throw authError;
        }
      }
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.16),_transparent_38%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--background)))] px-4 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-5xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Family Setup
          </div>
          <div className="space-y-4">
            <h1 className="max-w-xl font-nunito text-5xl font-black tracking-tight text-foreground">
              Set up your household once. Keep the real work organized after that.
            </h1>
            <p className="max-w-xl text-base leading-7 text-muted-foreground">
              Start with your parent account, then build the family, add a spouse, create child access, and assign starter chores before anything is written to the database.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              'Draft survives refresh and Google return',
              'Username-based child accounts supported',
              'Nothing is created until final submit',
            ].map((item) => (
              <div key={item} className="rounded-3xl border border-border/70 bg-card/70 p-4 text-sm text-muted-foreground shadow-sm backdrop-blur">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-border/70 bg-card/95 p-6 shadow-xl shadow-primary/5 backdrop-blur">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/75">Step 1</p>
              <h2 className="mt-2 text-2xl font-black text-foreground font-nunito">Parent account</h2>
            </div>
            <div className="rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground">
              GoGettr
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex rounded-2xl border border-border p-1">
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError('');
                }}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  mode === 'signup' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                }`}
              >
                Create account
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError('');
                }}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  mode === 'signin' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                }`}
              >
                Sign in
              </button>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              className="h-12 w-full justify-center gap-3 rounded-2xl text-sm font-semibold"
            >
              <GoogleIcon />
              Continue with Google
            </Button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Username</label>
                <Input
                  aria-label="Username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="jane-parent"
                  autoComplete="username"
                  className="h-12 rounded-2xl"
                />
                <p className="text-xs text-muted-foreground">
                  Anything typed here is treated as a username, even if it looks like an email address.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Password</label>
                <Input
                  aria-label="Password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && handleUsernameSubmit()}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  className="h-12 rounded-2xl"
                />
              </div>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button
              type="button"
              onClick={handleUsernameSubmit}
              disabled={loading}
              className="h-12 w-full rounded-2xl text-sm font-semibold"
            >
              {loading ? 'Working…' : mode === 'signup' ? 'Create account' : 'Sign in'}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
