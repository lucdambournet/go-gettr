import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';

export default function FamilySetup() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<'profile' | 'family' | 'saving'>('profile');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [error, setError] = useState('');

  const handleNext = () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter your first and last name.');
      return;
    }
    setError('');
    setStep('family');
  };

  const handleCreate = async () => {
    if (!familyName.trim()) {
      setError('Please enter a family name.');
      return;
    }
    if (!user) return;
    setError('');
    setStep('saving');

    try {
      // Create the family first
      const { data: newFamily, error: familyErr } = await supabase
        .from('families')
        .insert({ name: familyName.trim(), created_by: user.id })
        .select()
        .single();

      if (familyErr || !newFamily) throw familyErr ?? new Error('Failed to create family');

      // Create the parent's profile
      const { error: profileErr } = await supabase
        .from('profiles')
        .insert({
          auth_user_id: user.id,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: user.email ?? '',
          role: 'parent',
          family_id: newFamily.id,
        });

      if (profileErr) throw profileErr;

      await refreshProfile();
      navigate('/', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setStep('family');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 22 }}
        className="w-full max-w-sm space-y-6"
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <svg width="32" height="32" viewBox="0 0 20 20" fill="none">
              <path d="M10 2C10 2 5 7 5 12C5 14.761 7.239 17 10 17C12.761 17 15 14.761 15 12C15 7 10 2 10 2Z" fill="url(#setup-flame)" />
              <circle cx="10" cy="12.5" r="2.5" fill="rgba(255,255,255,0.4)" />
              <defs>
                <linearGradient id="setup-flame" x1="10" y1="2" x2="10" y2="17" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#f97316" />
                  <stop offset="1" stopColor="#fde68a" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black text-foreground tracking-tight font-nunito">
              {step === 'profile' ? "Let's get started" : "Name your family"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {step === 'profile'
                ? 'Tell us your name to set up your account'
                : "This is how your family will appear in the app"}
            </p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 justify-center">
          {['profile', 'family'].map((s, i) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step === s || (step === 'saving' && s === 'family')
                  ? 'w-8 bg-primary'
                  : i === 0 && (step === 'family' || step === 'saving')
                  ? 'w-8 bg-primary/40'
                  : 'w-4 bg-border'
              }`}
            />
          ))}
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          {step === 'profile' && (
            <>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">First name</label>
                  <Input
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="Jane"
                    className="h-10 rounded-xl"
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Last name</label>
                  <Input
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Smith"
                    className="h-10 rounded-xl"
                    onKeyDown={e => e.key === 'Enter' && handleNext()}
                  />
                </div>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <Button className="w-full h-10 rounded-xl font-semibold" onClick={handleNext}>
                Continue
              </Button>
            </>
          )}

          {(step === 'family' || step === 'saving') && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Family name</label>
                <Input
                  value={familyName}
                  onChange={e => setFamilyName(e.target.value)}
                  placeholder="The Smith Family"
                  className="h-10 rounded-xl"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  disabled={step === 'saving'}
                />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="h-10 rounded-xl font-semibold"
                  onClick={() => { setStep('profile'); setError(''); }}
                  disabled={step === 'saving'}
                >
                  Back
                </Button>
                <Button
                  className="flex-1 h-10 rounded-xl font-semibold"
                  onClick={handleCreate}
                  disabled={step === 'saving'}
                >
                  {step === 'saving' ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating…
                    </span>
                  ) : (
                    'Create Family'
                  )}
                </Button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          You'll be the parent admin. You can invite others after setup.
        </p>
      </motion.div>
    </div>
  );
}
