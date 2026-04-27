import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { buildInternalAuthEmail } from '@/lib/familySetupAuth';
import { isE2EMockAuthEnabled, writeE2EAuthState } from '@/lib/e2eAuth';
import {
  createEmptyFamilySetupDraft,
  readFamilySetupDraft,
  writeFamilySetupDraft,
} from '@/lib/familySetupDraft';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import GoogleIcon from '@/components/icons/GoogleIcon';

type AuthMode = 'signin' | 'signup';

// ─── App UI mockups (white cards — look like screenshots on dark bg) ──────────

const DailyMockup = () => (
  <div className="rounded-2xl bg-white p-4 shadow-2xl space-y-2 text-sm border border-slate-100">
    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2.5">Today · Emma</p>
    {[
      { label: 'Make bed', done: true, emoji: '🛏️' },
      { label: 'Feed the dog', done: true, emoji: '🐶' },
      { label: 'Take out trash', done: false, emoji: '🗑️' },
      { label: 'Homework', done: false, emoji: '📚' },
    ].map(item => (
      <div key={item.label} className="flex items-center gap-2.5">
        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${item.done ? 'bg-green-500 text-white' : 'border-2 border-slate-200'}`}>
          {item.done && '✓'}
        </div>
        <span className={`text-xs ${item.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>{item.emoji} {item.label}</span>
      </div>
    ))}
    <div className="pt-1 flex items-center gap-2 text-[10px] text-slate-400">
      <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full w-1/2 rounded-full bg-green-500" />
      </div>
      2 / 4
    </div>
  </div>
);

const StreakMockup = () => (
  <div className="rounded-2xl bg-white p-4 shadow-2xl border border-slate-100">
    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2.5">Streak Board</p>
    <div className="space-y-2">
      {[
        { name: 'Sophie', streak: 21, color: 'bg-amber-100 text-amber-700' },
        { name: 'Emma', streak: 14, color: 'bg-indigo-100 text-indigo-700' },
        { name: 'Liam', streak: 7, color: 'bg-pink-100 text-pink-700' },
      ].map((p, i) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black bg-slate-100 text-slate-500">{i + 1}</div>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${p.color}`}>{p.name[0]}</div>
          <span className="flex-1 text-xs font-medium text-slate-700">{p.name}</span>
          <span className="text-xs font-black text-amber-500">🔥 {p.streak}</span>
        </div>
      ))}
    </div>
    <div className="mt-2.5 rounded-xl bg-amber-50 border border-amber-100 p-2 text-[10px] text-amber-700 font-medium">
      +$2.63 streak bonus unlocked! 🏆
    </div>
  </div>
);

const BankMockup = () => (
  <div className="rounded-2xl bg-white p-4 shadow-2xl border border-slate-100 space-y-2.5">
    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Family Bank</p>
    {[
      { name: 'Emma', amount: '$12.75', color: 'bg-indigo-100 text-indigo-700' },
      { name: 'Liam', amount: '$8.50', color: 'bg-pink-100 text-pink-700' },
    ].map(item => (
      <div key={item.name} className="flex items-center gap-2.5">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${item.color}`}>{item.name[0]}</div>
        <span className="flex-1 text-sm font-semibold text-slate-700">{item.name}</span>
        <span className="text-sm font-black text-green-600">{item.amount}</span>
      </div>
    ))}
    <div className="h-7 rounded-xl bg-green-500 flex items-center justify-center text-xs font-bold text-white">
      Approve Payout
    </div>
  </div>
);

const AchievementMockup = () => (
  <div className="rounded-2xl bg-white p-4 shadow-2xl border border-slate-100">
    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2.5">Achievements</p>
    <div className="grid grid-cols-3 gap-1.5">
      {[
        { emoji: '⭐', label: 'First Step', unlocked: true },
        { emoji: '🔥', label: 'On a Roll', unlocked: true },
        { emoji: '🏆', label: 'Warrior', unlocked: true },
        { emoji: '⚡', label: 'Unstoppable', unlocked: false },
        { emoji: '👑', label: 'Legendary', unlocked: false },
        { emoji: '💎', label: 'Perfect', unlocked: false },
      ].map(a => (
        <div key={a.label} className={`rounded-xl p-1.5 text-center ${a.unlocked ? 'bg-amber-50 border border-amber-100' : 'bg-slate-50 opacity-40 grayscale'}`}>
          <div className="text-base">{a.emoji}</div>
          <div className="text-[9px] text-slate-500 mt-0.5 leading-tight font-medium">{a.label}</div>
        </div>
      ))}
    </div>
  </div>
);

const WeeklyMockup = () => (
  <div className="rounded-2xl bg-white p-4 shadow-2xl border border-slate-100">
    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2.5">This Week</p>
    <div className="space-y-1.5">
      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
        const vals = [5, 4, 5, 3, 4, 2, 1];
        const pct = Math.round((vals[i] / 5) * 100);
        return (
          <div key={day} className="flex items-center gap-2 text-xs">
            <span className="w-6 text-[10px] text-slate-400 font-medium">{day}</span>
            <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full ${pct === 100 ? 'bg-green-500' : pct >= 60 ? 'bg-indigo-400' : 'bg-amber-400'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400">{vals[i]}/5</span>
          </div>
        );
      })}
    </div>
  </div>
);

const FamilyMockup = () => (
  <div className="rounded-2xl bg-white p-4 shadow-2xl border border-slate-100 space-y-2">
    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Your Family</p>
    {[
      { name: 'Sarah', role: 'Parent', color: 'bg-indigo-500' },
      { name: 'Jake', role: 'Parent', color: 'bg-violet-500' },
      { name: 'Emma', role: 'Child', color: 'bg-pink-400' },
      { name: 'Liam', role: 'Child', color: 'bg-amber-400' },
    ].map(p => (
      <div key={p.name} className="flex items-center gap-2.5">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white ${p.color}`}>{p.name[0]}</div>
        <span className="flex-1 text-sm font-semibold text-slate-700">{p.name}</span>
        <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${p.role === 'Parent' ? 'bg-indigo-50 text-indigo-600' : 'bg-green-50 text-green-600'}`}>{p.role}</span>
      </div>
    ))}
  </div>
);

// ─── Login slide panel (unchanged logic) ──────────────────────────────────────

interface LoginPanelProps {
  onClose: () => void;
}

function LoginPanel({ onClose }: LoginPanelProps) {
  const [mode, setMode] = useState<AuthMode>('signup');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const seedDraft = (nextMode: 'google' | 'username') => {
    const existing = readFamilySetupDraft() ?? createEmptyFamilySetupDraft({ childCount: 0 });
    writeFamilySetupDraft({ ...existing, parentAuth: { mode: nextMode, username: username.trim() } });
  };

  const handleGoogle = () => {
    seedDraft('google');
    if (isE2EMockAuthEnabled()) {
      writeE2EAuthState({ user: { id: 'e2e-parent-auth-user', email: 'parent@example.com' }, profile: null, family: null });
      window.location.assign('/family/setup');
      return;
    }
    supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/family/setup` } });
  };

  const handleSubmit = async () => {
    setError('');
    if (!username.trim()) { setError('Enter a username.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    seedDraft('username');
    try {
      const authEmail = buildInternalAuthEmail(username);
      if (isE2EMockAuthEnabled()) {
        writeE2EAuthState({ user: { id: 'e2e-parent-auth-user', email: authEmail }, profile: null, family: null });
        window.location.assign('/family/setup');
        return;
      }
      if (mode === 'signin') {
        const { error: e } = await supabase.auth.signInWithPassword({ email: authEmail, password });
        if (e) throw e;
      } else {
        const { error: e } = await supabase.auth.signUp({ email: authEmail, password });
        if (e) throw e;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      key="backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4"
      onClick={onClose}
    >
      <motion.div
        key="panel"
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="w-full max-w-md bg-card shadow-2xl overflow-y-auto flex flex-col rounded-2xl max-h-[90dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border/60">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary/70">Welcome</p>
            <h2 className="mt-1 text-2xl font-black font-nunito text-foreground">Get started</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 px-6 py-6 space-y-5">
          <div className="flex rounded-2xl border border-border p-1">
            {(['signup', 'signin'] as AuthMode[]).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${mode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {m === 'signup' ? 'Create account' : 'Sign in'}
              </button>
            ))}
          </div>
          <Button type="button" variant="outline" onClick={handleGoogle} className="h-12 w-full justify-center gap-3 rounded-2xl text-sm font-semibold">
            <GoogleIcon />
            Continue with Google
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-widest text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Username</label>
              <Input aria-label="Username" value={username} onChange={e => setUsername(e.target.value)} placeholder="jane-parent" autoComplete="username" className="h-12 rounded-2xl" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Password</label>
              <Input aria-label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} className="h-12 rounded-2xl" />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="button" onClick={handleSubmit} disabled={loading} className="h-12 w-full rounded-2xl text-sm font-semibold">
            {loading ? 'Working…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </Button>
          <p className="text-center text-xs text-muted-foreground leading-relaxed">
            After signing in you'll walk through a quick family setup — takes about 2 minutes.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const bentoFeatures = [
  {
    tag: 'Daily Tasks',
    title: 'Every chore tracked, nothing missed.',
    desc: 'Per-person checklists with real-time progress.',
    mockup: <DailyMockup />,
    accent: '#22c55e',
    colSpan: 'lg:col-span-2',
  },
  {
    tag: 'Streaks',
    title: 'Habits powered by fire.',
    desc: 'Daily streaks that multiply earnings.',
    mockup: <StreakMockup />,
    accent: '#f59e0b',
    colSpan: 'lg:col-span-1',
  },
  {
    tag: 'Family Bank',
    title: 'Real money, really earned.',
    desc: 'Parent-approved payouts, transparent balances.',
    mockup: <BankMockup />,
    accent: '#6366f1',
    colSpan: 'lg:col-span-1',
  },
  {
    tag: 'Achievements',
    title: 'Every milestone celebrated.',
    desc: 'Badges unlock as kids hit goals.',
    mockup: <AchievementMockup />,
    accent: '#f59e0b',
    colSpan: 'lg:col-span-2',
  },
  {
    tag: 'Weekly View',
    title: 'Patterns you can actually see.',
    desc: 'Seven-day grid shows wins and slumps at a glance.',
    mockup: <WeeklyMockup />,
    accent: '#a78bfa',
    colSpan: 'lg:col-span-2',
  },
  {
    tag: 'Family Hub',
    title: 'Your whole household, one place.',
    desc: 'Co-parents, kids, roles — managed together.',
    mockup: <FamilyMockup />,
    accent: '#6366f1',
    colSpan: 'lg:col-span-1',
  },
];

const steps = [
  { n: '01', title: 'Create your family', desc: 'Sign up, name your family, and invite a co-parent in minutes. Your draft saves automatically.' },
  { n: '02', title: 'Assign chores & goals', desc: 'Add kids, set chores with icons and frequencies, assign a payout per completion.' },
  { n: '03', title: 'Watch streaks grow', desc: 'Kids tick off tasks, build streaks, earn badges, and collect real allowance.' },
];

// ─── Stagger animation variants ───────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
};

const slideUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Landing() {
  const { user, profile, isLoadingAuth } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);

  if (!isLoadingAuth && user) {
    return <Navigate to={profile ? '/Daily' : '/family/setup'} replace />;
  }

  return (
    <div style={{ background: '#07091a', color: 'white', fontFamily: 'Inter, sans-serif', overflowX: 'hidden' }}>

      {/* ── NAVBAR ── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(7,9,26,0.8)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1, #818cf8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '14px', color: 'white',
              boxShadow: '0 0 20px rgba(99,102,241,0.6)',
            }}>G</div>
            <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '18px', letterSpacing: '-0.01em' }}>GoGettr</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => setLoginOpen(true)}
              style={{
                padding: '8px 16px', borderRadius: '10px', background: 'transparent',
                border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.65)',
                fontWeight: 600, fontSize: '13px', cursor: 'pointer',
              }}
            >
              Log in
            </button>
            <button
              onClick={() => setLoginOpen(true)}
              style={{
                padding: '9px 20px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                border: 'none', color: 'white',
                fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                boxShadow: '0 0 24px rgba(99,102,241,0.45)',
              }}
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', paddingTop: '80px', overflow: 'hidden' }}>
        {/* Background atmosphere */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{
            position: 'absolute', top: '-15%', left: '-10%',
            width: '700px', height: '700px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 65%)',
            filter: 'blur(1px)',
          }} />
          <div style={{
            position: 'absolute', bottom: '-5%', right: '-8%',
            width: '550px', height: '550px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 65%)',
          }} />
          {/* Dot grid */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.18) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }} />
        </div>

        <div style={{ maxWidth: '1152px', width: '100%', margin: '0 auto', padding: '60px 24px', position: 'relative', zIndex: 1 }}>
          <div className="flex flex-col lg:flex-row gap-16 items-center">

            {/* Left — text */}
            <motion.div
              className="flex-1"
              initial="hidden"
              animate="visible"
              variants={containerVariants}
              style={{ maxWidth: '600px' }}
            >
              <motion.div variants={slideUp}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '7px',
                  padding: '5px 14px', borderRadius: '999px',
                  background: 'rgba(99,102,241,0.12)',
                  border: '1px solid rgba(99,102,241,0.35)',
                  fontSize: '11px', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                  color: '#a5b4fc', marginBottom: '28px',
                }}>
                  <span style={{ fontSize: '14px' }}>✦</span> Free Family Chore Tracker
                </div>
              </motion.div>

              <motion.h1 variants={slideUp} style={{
                fontFamily: 'Syne, sans-serif', fontWeight: 900,
                fontSize: 'clamp(2.8rem, 6vw, 5.5rem)',
                lineHeight: 1.0, letterSpacing: '-0.03em',
                marginBottom: '24px',
              }}>
                Make chores<br />
                <span style={{
                  background: 'linear-gradient(135deg, #818cf8 0%, #c4b5fd 45%, #f59e0b 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>hit different.</span>
              </motion.h1>

              <motion.p variants={slideUp} style={{
                fontSize: '18px', lineHeight: 1.65,
                color: 'rgba(255,255,255,0.48)',
                maxWidth: '480px', marginBottom: '40px',
              }}>
                Turn daily tasks into streaks, badges, and real allowance. GoGettr keeps every kid accountable — automatically.
              </motion.p>

              <motion.div variants={slideUp} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  onClick={() => setLoginOpen(true)}
                  style={{
                    padding: '14px 30px', borderRadius: '14px',
                    background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
                    border: 'none', color: 'white',
                    fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '16px', cursor: 'pointer',
                    boxShadow: '0 0 40px rgba(99,102,241,0.5), 0 8px 32px rgba(99,102,241,0.2)',
                  }}
                >
                  Get Started Free →
                </button>
                <button
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                  style={{
                    padding: '14px 22px', borderRadius: '14px', background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.55)',
                    fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                  }}
                >
                  See features ↓
                </button>
              </motion.div>

              <motion.div variants={slideUp} style={{ display: 'flex', gap: '36px', marginTop: '52px', flexWrap: 'wrap' }}>
                {[
                  { value: '$0', label: 'Forever free' },
                  { value: '∞', label: 'Streak potential' },
                  { value: '9+', label: 'Badge types' },
                ].map(s => (
                  <div key={s.label}>
                    <div style={{
                      fontFamily: 'Syne, sans-serif', fontWeight: 900, fontSize: '2.2rem', lineHeight: 1,
                      background: 'linear-gradient(135deg, #818cf8, #c4b5fd)',
                      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                    }}>{s.value}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.38)', marginTop: '4px', fontWeight: 500 }}>{s.label}</div>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Right — floating card cluster (desktop only) */}
            <motion.div
              className="hidden lg:block flex-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.35 }}
              style={{ position: 'relative', height: '440px', minWidth: '360px' }}
            >
              <motion.div
                animate={{ y: [0, -14, 0] }}
                transition={{ repeat: Infinity, duration: 3.7, ease: 'easeInOut' }}
                style={{
                  position: 'absolute', left: 0, top: '50px',
                  width: '230px',
                  transform: 'rotate(-4deg)',
                  filter: 'drop-shadow(0 24px 48px rgba(0,0,0,0.55))',
                  zIndex: 2,
                }}
              >
                <DailyMockup />
              </motion.div>

              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 4.3, ease: 'easeInOut', delay: 0.7 }}
                style={{
                  position: 'absolute', right: 0, top: '10px',
                  width: '205px',
                  transform: 'rotate(3.5deg)',
                  filter: 'drop-shadow(0 24px 48px rgba(0,0,0,0.55))',
                  zIndex: 3,
                }}
              >
                <StreakMockup />
              </motion.div>

              <motion.div
                animate={{ y: [0, -12, 0] }}
                transition={{ repeat: Infinity, duration: 4.0, ease: 'easeInOut', delay: 1.4 }}
                style={{
                  position: 'absolute', left: '70px', bottom: '20px',
                  width: '200px',
                  transform: 'rotate(-1.5deg)',
                  filter: 'drop-shadow(0 24px 48px rgba(0,0,0,0.55))',
                  zIndex: 4,
                }}
              >
                <BankMockup />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FEATURES BENTO ── */}
      <section id="features" style={{ padding: '100px 24px', background: 'rgba(255,255,255,0.018)' }}>
        <div style={{ maxWidth: '1152px', margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5 }}
            style={{ textAlign: 'center', marginBottom: '60px' }}
          >
            <div style={{
              fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.12em', color: '#a5b4fc', marginBottom: '14px',
            }}>
              Everything included
            </div>
            <h2 style={{
              fontFamily: 'Syne, sans-serif', fontWeight: 900,
              fontSize: 'clamp(2rem, 4vw, 3rem)', lineHeight: 1.1,
              letterSpacing: '-0.025em', marginBottom: '16px',
            }}>
              One app. The whole system.
            </h2>
            <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.42)', maxWidth: '480px', margin: '0 auto', lineHeight: 1.6 }}>
              From daily checklists to streak leaderboards to real payout tracking.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {bentoFeatures.map((card, i) => (
              <motion.div
                key={card.tag}
                className={card.colSpan}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
                whileHover={{ scale: 1.015, transition: { duration: 0.2 } }}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '20px', padding: '28px',
                  overflow: 'hidden', position: 'relative',
                }}
              >
                {/* Accent top stripe */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                  background: `linear-gradient(90deg, ${card.accent}cc, transparent)`,
                }} />

                <div style={{
                  display: 'inline-flex', alignItems: 'center',
                  padding: '3px 10px', borderRadius: '999px',
                  background: `${card.accent}18`,
                  border: `1px solid ${card.accent}38`,
                  fontSize: '10px', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                  color: card.accent, marginBottom: '10px',
                }}>
                  {card.tag}
                </div>

                <h3 style={{
                  fontFamily: 'Syne, sans-serif', fontWeight: 800,
                  fontSize: '17px', lineHeight: 1.25, color: 'white',
                  marginBottom: '6px',
                }}>
                  {card.title}
                </h3>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.38)', lineHeight: 1.55, marginBottom: '20px' }}>
                  {card.desc}
                </p>

                <div style={{ transform: 'scale(0.9)', transformOrigin: 'top left', width: '111%' }}>
                  {card.mockup}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5 }}
            style={{ textAlign: 'center', marginBottom: '72px' }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#a5b4fc', marginBottom: '14px' }}>
              How it works
            </div>
            <h2 style={{
              fontFamily: 'Syne, sans-serif', fontWeight: 900,
              fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', lineHeight: 1.1, letterSpacing: '-0.025em',
            }}>
              Up and running in minutes
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {steps.map((step, i) => (
              <motion.div
                key={step.n}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '20px', padding: '32px 28px',
                  position: 'relative', overflow: 'hidden',
                }}
              >
                <div style={{
                  position: 'absolute', top: '-4px', right: '16px',
                  fontFamily: 'Syne, sans-serif', fontWeight: 900, fontSize: '88px', lineHeight: 1,
                  color: 'rgba(99,102,241,0.1)', letterSpacing: '-0.04em',
                  userSelect: 'none', pointerEvents: 'none',
                }}>
                  {step.n}
                </div>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: 'rgba(99,102,241,0.14)',
                  border: '1px solid rgba(99,102,241,0.28)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Syne, sans-serif', fontWeight: 900, fontSize: '13px', color: '#818cf8',
                  marginBottom: '20px',
                }}>
                  {step.n}
                </div>
                <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '19px', color: 'white', marginBottom: '10px', lineHeight: 1.2 }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.42)', lineHeight: 1.65 }}>
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '0 24px 100px' }}>
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.55 }}
          style={{
            maxWidth: '880px', margin: '0 auto',
            borderRadius: '28px',
            background: 'linear-gradient(135deg, #312e81 0%, #4338ca 45%, #6366f1 100%)',
            padding: 'clamp(48px, 8vw, 80px) clamp(32px, 6vw, 64px)',
            textAlign: 'center', position: 'relative', overflow: 'hidden',
            boxShadow: '0 0 80px rgba(99,102,241,0.35), 0 40px 80px rgba(0,0,0,0.4)',
          }}
        >
          {/* Decorative circles */}
          <div style={{
            position: 'absolute', top: '-70px', right: '-70px',
            width: '260px', height: '260px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.07)', pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: '-50px', left: '-50px',
            width: '200px', height: '200px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)', pointerEvents: 'none',
          }} />
          <div style={{
            fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.15em', color: 'rgba(255,255,255,0.55)', marginBottom: '18px',
          }}>
            Free forever
          </div>
          <h2 style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 900,
            fontSize: 'clamp(2rem, 4.5vw, 3.2rem)', lineHeight: 1.1,
            letterSpacing: '-0.025em', marginBottom: '18px',
          }}>
            Your family is ready for this.
          </h2>
          <p style={{
            fontSize: '18px', color: 'rgba(255,255,255,0.68)', lineHeight: 1.65,
            maxWidth: '480px', margin: '0 auto 40px',
          }}>
            Set up in 5 minutes. Kids, chores, streaks, allowance — all in one place.
          </p>
          <button
            onClick={() => setLoginOpen(true)}
            style={{
              padding: '16px 40px', borderRadius: '14px',
              background: 'white', color: '#4338ca',
              fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '17px',
              border: 'none', cursor: 'pointer',
              boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
            }}
          >
            Start Free Today →
          </button>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '32px 24px' }}>
        <div style={{
          maxWidth: '1152px', margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '26px', height: '26px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366f1, #818cf8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '11px', color: 'white',
            }}>G</div>
            <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '15px' }}>GoGettr</span>
          </div>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>Built for families who mean business.</p>
        </div>
      </footer>

      {/* ── LOGIN PANEL ── */}
      <AnimatePresence>
        {loginOpen && <LoginPanel onClose={() => setLoginOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
