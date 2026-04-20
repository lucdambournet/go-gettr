import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import GoogleIcon from '@/components/icons/GoogleIcon';

type Mode = 'signin' | 'signup';

export default function Login() {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/Daily" replace />;
  }

  const handleGoogleSignIn = () => {
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  };

  const handleEmailSubmit = async () => {
    setError('');
    setInfo('');
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (err) throw err;
      } else {
        const { error: err } = await supabase.auth.signUp({ email: email.trim(), password });
        if (err) throw err;
        setInfo('Check your email to confirm your account, then sign in.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <svg width="32" height="32" viewBox="0 0 20 20" fill="none">
              <path d="M10 2C10 2 5 7 5 12C5 14.761 7.239 17 10 17C12.761 17 15 14.761 15 12C15 7 10 2 10 2Z" fill="url(#login-flame)" />
              <circle cx="10" cy="12.5" r="2.5" fill="rgba(255,255,255,0.4)" />
              <defs>
                <linearGradient id="login-flame" x1="10" y1="2" x2="10" y2="17" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#f97316" />
                  <stop offset="1" stopColor="#fde68a" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black text-foreground tracking-tight font-nunito">go-gettr</h1>
            <p className="text-sm text-muted-foreground mt-1">Sign in to continue</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          {/* Mode toggle */}
          <div className="flex rounded-xl overflow-hidden border border-border">
            <button
              onClick={() => { setMode('signin'); setError(''); setInfo(''); }}
              className={`flex-1 py-2 text-sm font-semibold transition-colors ${mode === 'signin' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Sign in
            </button>
            <button
              onClick={() => { setMode('signup'); setError(''); setInfo(''); }}
              className={`flex-1 py-2 text-sm font-semibold transition-colors ${mode === 'signup' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Create account
            </button>
          </div>

          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="h-10 rounded-xl"
              autoComplete="email"
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="h-10 rounded-xl"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              onKeyDown={e => e.key === 'Enter' && handleEmailSubmit()}
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
          {info && <p className="text-xs text-emerald-600">{info}</p>}

          <Button
            onClick={handleEmailSubmit}
            disabled={loading}
            className="w-full h-10 rounded-xl font-semibold"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {mode === 'signin' ? 'Signing in…' : 'Creating account…'}
              </span>
            ) : mode === 'signin' ? 'Sign in' : 'Create account'}
          </Button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <Button
            onClick={handleGoogleSignIn}
            variant="outline"
            className="w-full h-10 gap-3 text-sm font-semibold rounded-xl"
          >
            <GoogleIcon />
            Continue with Google
          </Button>
        </div>
      </div>
    </div>
  );
}
