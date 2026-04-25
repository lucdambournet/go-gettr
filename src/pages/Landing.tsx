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

// ─── Mini UI mockups for feature illustrations ──────────────────────────────

const DailyMockup = () => (
  <div className="rounded-2xl bg-white p-4 shadow-md space-y-2.5 text-sm border border-slate-100">
    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">Today · Emma</p>
    {[
      { label: 'Make bed', done: true, emoji: '🛏️' },
      { label: 'Feed the dog', done: true, emoji: '🐶' },
      { label: 'Take out trash', done: false, emoji: '🗑️' },
      { label: 'Homework check', done: false, emoji: '📚' },
    ].map(item => (
      <div key={item.label} className="flex items-center gap-3">
        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${item.done ? 'bg-green-500 text-white' : 'border-2 border-slate-200'}`}>
          {item.done && '✓'}
        </div>
        <span className={`${item.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>{item.emoji} {item.label}</span>
      </div>
    ))}
    <div className="pt-2 flex items-center gap-2 text-[11px] text-slate-400">
      <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full w-1/2 rounded-full bg-green-500" />
      </div>
      2 / 4 done today
    </div>
  </div>
);

const StreakMockup = () => (
  <div className="rounded-2xl bg-white p-4 shadow-md border border-slate-100">
    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">Streak Board</p>
    <div className="space-y-2">
      {[
        { name: 'Emma', streak: 14, color: 'bg-indigo-100 text-indigo-700' },
        { name: 'Liam', streak: 7, color: 'bg-pink-100 text-pink-700' },
        { name: 'Sophie', streak: 21, color: 'bg-amber-100 text-amber-700' },
      ].map((p, i) => (
        <div key={p.name} className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black bg-slate-100 text-slate-500">{i + 1}</div>
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${p.color}`}>{p.name[0]}</div>
          <span className="flex-1 text-sm font-medium text-slate-700">{p.name}</span>
          <div className="flex items-center gap-1 text-sm font-black text-amber-500">🔥 {p.streak}</div>
        </div>
      ))}
    </div>
    <div className="mt-3 rounded-xl bg-amber-50 border border-amber-100 p-2.5 text-[11px] text-amber-700 font-medium">
      Sophie's on a 21-day streak! 🏆 +$2.63 bonus
    </div>
  </div>
);

const BankMockup = () => (
  <div className="rounded-2xl bg-white p-4 shadow-md border border-slate-100 space-y-3">
    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Family Bank</p>
    {[
      { name: 'Emma', amount: '$12.75', pending: '$4.75', color: 'bg-indigo-100 text-indigo-700' },
      { name: 'Liam', amount: '$8.50', pending: '$3.50', color: 'bg-pink-100 text-pink-700' },
    ].map(item => (
      <div key={item.name} className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${item.color}`}>{item.name[0]}</div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-slate-700">{item.name}</div>
          <div className="text-[11px] text-slate-400">{item.pending} pending payout</div>
        </div>
        <div className="text-sm font-black text-green-600">{item.amount}</div>
      </div>
    ))}
    <div className="flex items-center gap-2 pt-1">
      <div className="flex-1 h-7 rounded-xl bg-green-500 flex items-center justify-center text-xs font-bold text-white">Pay Out</div>
      <div className="flex-1 h-7 rounded-xl border border-slate-200 flex items-center justify-center text-xs font-semibold text-slate-500">History</div>
    </div>
  </div>
);

const AchievementMockup = () => (
  <div className="rounded-2xl bg-white p-4 shadow-md border border-slate-100">
    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">Achievements Unlocked</p>
    <div className="grid grid-cols-3 gap-2">
      {[
        { emoji: '⭐', label: 'First Step', unlocked: true },
        { emoji: '🔥', label: 'On a Roll', unlocked: true },
        { emoji: '🏆', label: 'Week Warrior', unlocked: true },
        { emoji: '⚡', label: 'Unstoppable', unlocked: false },
        { emoji: '👑', label: 'Legendary', unlocked: false },
        { emoji: '💎', label: 'Perfect Week', unlocked: false },
      ].map(a => (
        <div key={a.label} className={`rounded-xl p-2 text-center transition-all ${a.unlocked ? 'bg-amber-50 border border-amber-100' : 'bg-slate-50 opacity-40 grayscale'}`}>
          <div className="text-xl">{a.emoji}</div>
          <div className="text-[10px] text-slate-500 mt-0.5 leading-tight font-medium">{a.label}</div>
        </div>
      ))}
    </div>
  </div>
);

const WeeklyMockup = () => (
  <div className="rounded-2xl bg-white p-4 shadow-md border border-slate-100">
    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">This Week · All Kids</p>
    <div className="space-y-2">
      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
        const vals = [5, 4, 5, 3, 4, 2, 1];
        const max = 5;
        const done = vals[i];
        const pct = Math.round((done / max) * 100);
        return (
          <div key={day} className="flex items-center gap-3 text-xs">
            <span className="w-7 text-slate-400 font-medium">{day}</span>
            <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full ${pct === 100 ? 'bg-green-500' : pct >= 60 ? 'bg-indigo-400' : 'bg-amber-400'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-slate-400">{done}/{max}</span>
          </div>
        );
      })}
    </div>
  </div>
);

const FamilyMockup = () => (
  <div className="rounded-2xl bg-white p-4 shadow-md border border-slate-100 space-y-3">
    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Your Family</p>
    {[
      { name: 'Sarah (you)', role: 'Parent', color: 'bg-indigo-500', extra: 'Manages chores & payouts' },
      { name: 'Jake', role: 'Parent', color: 'bg-violet-500', extra: 'Co-admin access' },
      { name: 'Emma', role: 'Child · Age 10', color: 'bg-pink-400', extra: '$5 / week allowance' },
      { name: 'Liam', role: 'Child · Age 8', color: 'bg-amber-400', extra: '$4 / week allowance' },
    ].map(p => (
      <div key={p.name} className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0 ${p.color}`}>{p.name[0]}</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-700 truncate">{p.name}</div>
          <div className="text-[10px] text-slate-400 truncate">{p.extra}</div>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${p.role.startsWith('Parent') ? 'bg-indigo-50 text-indigo-600' : 'bg-green-50 text-green-600'}`}>{p.role.split('·')[0].trim()}</span>
      </div>
    ))}
  </div>
);

// ─── Feature card data ───────────────────────────────────────────────────────

const features = [
  {
    id: 'daily',
    tag: 'Daily Tasks',
    title: 'Every chore, every day — nothing slips.',
    desc: 'A clean checklist for each family member shows exactly what needs doing today. One tap marks it done, with instant progress tracking.',
    mockup: <DailyMockup />,
    accent: 'from-green-50 to-emerald-50',
    dot: 'bg-green-500',
  },
  {
    id: 'streaks',
    tag: 'Streaks & Check-ins',
    title: 'Habits that stick — powered by fire.',
    desc: 'Kids build daily streaks that unlock reward multipliers. The longer the streak, the bigger the bonus. Breaking it stings just enough to care.',
    mockup: <StreakMockup />,
    accent: 'from-amber-50 to-orange-50',
    dot: 'bg-amber-500',
  },
  {
    id: 'bank',
    tag: 'Family Bank',
    title: 'Real allowances, earned the right way.',
    desc: 'Every completed chore adds to a child\'s balance. Parents approve payouts with one click. Kids see exactly what they\'ve earned — and what they\'re owed.',
    mockup: <BankMockup />,
    accent: 'from-emerald-50 to-teal-50',
    dot: 'bg-emerald-500',
  },
  {
    id: 'achievements',
    tag: 'Achievements',
    title: 'Badges that make consistency feel epic.',
    desc: 'From "First Step" to "Legendary", every milestone is recognized. Achievements unlock automatically as kids hit streaks, perfect weeks, and earning goals.',
    mockup: <AchievementMockup />,
    accent: 'from-yellow-50 to-amber-50',
    dot: 'bg-yellow-500',
  },
  {
    id: 'weekly',
    tag: 'Weekly View',
    title: 'The full picture at a glance.',
    desc: 'A week-at-a-view layout shows completion rates by day and by child. Spot patterns, celebrate wins, and address slumps before they become habits.',
    mockup: <WeeklyMockup />,
    accent: 'from-purple-50 to-indigo-50',
    dot: 'bg-purple-500',
  },
  {
    id: 'family',
    tag: 'Family Management',
    title: 'Your household, exactly how you run it.',
    desc: 'Invite a co-parent, add kids with Google accounts or simple usernames, set individual allowances, and manage everything from one parent dashboard.',
    mockup: <FamilyMockup />,
    accent: 'from-indigo-50 to-blue-50',
    dot: 'bg-indigo-500',
  },
];

const steps = [
  { n: '01', title: 'Create your family', desc: 'Sign up, name your family, and invite a co-parent in minutes. Your setup draft saves automatically — even if you bounce away mid-flow.' },
  { n: '02', title: 'Add kids & assign chores', desc: 'Create child accounts with Google or a simple username. Assign chores with frequencies, icons, and a payout per completion.' },
  { n: '03', title: 'Check in every day', desc: 'Kids tick off chores, build streaks, earn badges, and watch their balance grow. Parents approve payouts whenever they\'re ready.' },
];

// ─── Login slide panel ───────────────────────────────────────────────────────

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
    <>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        key="panel"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 220 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-card shadow-2xl overflow-y-auto flex flex-col"
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
          {/* Mode toggle */}
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

          {/* Google */}
          <Button type="button" variant="outline" onClick={handleGoogle} className="h-12 w-full justify-center gap-3 rounded-2xl text-sm font-semibold">
            <GoogleIcon />
            Continue with Google
          </Button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-widest text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Username / Password */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Username</label>
              <Input
                aria-label="Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="jane-parent"
                autoComplete="username"
                className="h-12 rounded-2xl"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Password</label>
              <Input
                aria-label="Password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                className="h-12 rounded-2xl"
              />
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
    </>
  );
}

// ─── Main landing page ───────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export default function Landing() {
  const { user, profile, isLoadingAuth } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);

  if (!isLoadingAuth && user) {
    return <Navigate to={profile ? '/Daily' : '/family/setup'} replace />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Navbar ── */}
      <header className="fixed top-0 inset-x-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-sm font-nunito">G</div>
            <span className="font-nunito font-black text-lg text-foreground">GoGettr</span>
          </div>
          <Button
            onClick={() => setLoginOpen(true)}
            className="rounded-2xl px-5 h-9 text-sm font-semibold"
          >
            Login
          </Button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-32 pb-24 px-5">
        {/* Background gradient blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute top-20 right-0 w-[400px] h-[400px] rounded-full bg-accent/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary mb-8"
          >
            Family Chore & Allowance Tracker
          </motion.div>

          <motion.h1
            initial="hidden"
            animate="visible"
            variants={{ ...fadeUp, visible: { ...fadeUp.visible, transition: { duration: 0.55, ease: 'easeOut', delay: 0.08 } } }}
            className="font-nunito font-black text-5xl sm:text-6xl lg:text-7xl tracking-tight text-foreground leading-[1.05]"
          >
            Make chores&nbsp;fun.
            <br />
            <span className="text-primary">Keep everyone accountable.</span>
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="visible"
            variants={{ ...fadeUp, visible: { ...fadeUp.visible, transition: { duration: 0.55, ease: 'easeOut', delay: 0.16 } } }}
            className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto"
          >
            GoGettr turns daily chores into streaks, badges, and real allowance — for every kid in the family. Set it up once and let the system do the rest.
          </motion.p>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ ...fadeUp, visible: { ...fadeUp.visible, transition: { duration: 0.55, ease: 'easeOut', delay: 0.24 } } }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Button
              onClick={() => setLoginOpen(true)}
              className="h-13 px-8 rounded-2xl text-base font-bold shadow-lg shadow-primary/20"
              style={{ height: '3.25rem' }}
            >
              Get Started Free
            </Button>
            <button
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="h-13 px-6 rounded-2xl text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              style={{ height: '3.25rem' }}
            >
              See how it works ↓
            </button>
          </motion.div>

          {/* Hero stats */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ ...fadeUp, visible: { ...fadeUp.visible, transition: { duration: 0.55, ease: 'easeOut', delay: 0.32 } } }}
            className="mt-16 flex flex-wrap justify-center gap-8"
          >
            {[
              { value: '10+', label: 'Feature areas' },
              { value: '∞', label: 'Streak potential' },
              { value: '$0', label: 'To get started' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="font-nunito font-black text-3xl text-primary">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1 font-medium">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-24 px-5 bg-muted/30">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
            className="text-center mb-16"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">How it works</p>
            <h2 className="font-nunito font-black text-4xl text-foreground">Up and running in minutes</h2>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.n}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                variants={{ ...fadeUp, visible: { ...fadeUp.visible, transition: { duration: 0.5, ease: 'easeOut', delay: i * 0.1 } } }}
                className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm"
              >
                <div className="font-syne font-black text-5xl text-primary/15 mb-4 leading-none">{step.n}</div>
                <h3 className="font-nunito font-black text-lg text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-5">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
            className="text-center mb-16"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Everything included</p>
            <h2 className="font-nunito font-black text-4xl text-foreground">One app. The whole system.</h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto text-base">
              From daily checklists to streak leaderboards to real payout tracking — GoGettr covers every part of the family chore cycle.
            </p>
          </motion.div>

          <div className="space-y-8">
            {features.map((feature, i) => (
              <motion.div
                key={feature.id}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                variants={{ ...fadeUp, visible: { ...fadeUp.visible, transition: { duration: 0.5, ease: 'easeOut', delay: 0.05 } } }}
                className={`rounded-3xl bg-gradient-to-br ${feature.accent} border border-border/50 overflow-hidden`}
              >
                <div className={`grid gap-8 p-8 ${i % 2 === 0 ? 'lg:grid-cols-[1fr_1.1fr]' : 'lg:grid-cols-[1.1fr_1fr] lg:[&>*:first-child]:order-2'}`}>
                  {/* Text */}
                  <div className="flex flex-col justify-center space-y-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${feature.dot}`} />
                      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{feature.tag}</span>
                    </div>
                    <h3 className="font-nunito font-black text-2xl text-foreground leading-tight">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed text-sm">{feature.desc}</p>
                  </div>

                  {/* Mockup */}
                  <div className="flex items-center justify-center lg:justify-end">
                    <div className="w-full max-w-sm">
                      {feature.mockup}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-5">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
          className="mx-auto max-w-2xl text-center rounded-3xl bg-primary p-12 shadow-2xl shadow-primary/30"
        >
          <h2 className="font-nunito font-black text-4xl text-primary-foreground mb-4">
            Your family is ready for this.
          </h2>
          <p className="text-primary-foreground/80 text-base mb-8 leading-relaxed">
            Set up your household in under 5 minutes. Add your kids, assign their first chores, and watch the streaks begin.
          </p>
          <Button
            onClick={() => setLoginOpen(true)}
            className="h-13 px-10 rounded-2xl text-base font-bold bg-white text-primary hover:bg-white/90"
            style={{ height: '3.25rem' }}
          >
            Start Free Today
          </Button>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/50 py-8 px-5">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 font-nunito font-black text-foreground">
            <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-black text-xs">G</div>
            GoGettr
          </div>
          <p>Built for families who mean business.</p>
        </div>
      </footer>

      {/* ── Login slide panel ── */}
      <AnimatePresence>
        {loginOpen && <LoginPanel onClose={() => setLoginOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
