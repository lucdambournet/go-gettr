import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Bell, DollarSign, Globe, LogOut, Users, UserPlus, Pencil, X, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { entities } from "@/api/entities";
import { useQueryClient } from "@tanstack/react-query";
import FamilyMemberList from "@/components/family/FamilyMemberList";
import InviteDialog from "@/components/family/InviteDialog";

const PREFS_KEY = "choretracker-prefs";

const DEFAULT_PREFS = {
  currency: "USD",
  currencySymbol: "$",
  notifyStreakRisk: true,
  notifyChoresDue: true,
  notifyPayoutRequest: true,
  soundEffects: false,
  compactMode: false,
  showEarningsOnDashboard: true,
  weekStartsMonday: true,
};

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <motion.button type="button" whileTap={{ scale: 0.92 }} onClick={() => onChange(!value)}
      className={cn("w-11 h-6 rounded-full transition-colors duration-300 relative shrink-0", value ? "bg-primary" : "bg-secondary border border-border")}>
      <motion.div animate={{ x: value ? 20 : 2 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow" />
    </motion.button>
  );
}

function SettingRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border/50 last:border-0">
      <div>
        <div className="text-sm font-semibold text-foreground">{label}</div>
        {desc && <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>}
      </div>
      {children}
    </div>
  );
}

const CURRENCIES = [
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "CAD", symbol: "CA$", label: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar" },
  { code: "JPY", symbol: "¥", label: "Japanese Yen" },
  { code: "CHF", symbol: "Fr", label: "Swiss Franc" },
  { code: "NZD", symbol: "NZ$", label: "New Zealand Dollar" },
];

export default function Settings() {
  const { signOut, isParent, family, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingFamilyName, setEditingFamilyName] = useState(false);
  const [familyNameInput, setFamilyNameInput] = useState('');
  const [savingFamilyName, setSavingFamilyName] = useState(false);

  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');

  const toggleDark = (val: boolean) => {
    setIsDark(val);
    localStorage.setItem('theme', val ? 'dark' : 'light');
    if (val) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const [prefs, setPrefs] = useState(() => {
    try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}") }; } catch { return DEFAULT_PREFS; }
  });
  const [saved, setSaved] = useState(false);

  const saveFamilyName = useCallback(async () => {
    if (!family || !familyNameInput.trim()) return;
    if (import.meta.env.DEV) console.log('[Settings] family name update submitted', { newName: familyNameInput.trim() });
    setSavingFamilyName(true);
    await entities.Family.update(family.id, { name: familyNameInput.trim() });
    await Promise.all([
      refreshProfile(),
      queryClient.invalidateQueries({ queryKey: ['family-profiles', family.id] }),
    ]);
    setSavingFamilyName(false);
    setEditingFamilyName(false);
  }, [family, familyNameInput, queryClient, refreshProfile]);

  const setPref = (key: string, val: unknown) => setPrefs((p: typeof DEFAULT_PREFS) => ({ ...p, [key]: val }));

  const handleSave = () => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  return (
    <div className="space-y-8">
      <div className="relative -mx-4 md:-mx-8 -mt-4 md:-mt-8 px-4 md:px-8 pt-8 md:pt-10 pb-6 overflow-hidden"
        style={{ background: "linear-gradient(135deg, #6b728028 0%, #6b728010 70%, transparent 100%)" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 85% 50%, #6b72801e 0%, transparent 65%)" }} />
        <div className="relative">
          <h1 className="text-3xl font-black text-foreground tracking-tight font-nunito">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Customize your GoGettr experience</p>
        </div>
      </div>

      <div className="max-w-3xl space-y-6">
        {isParent && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Family
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                {editingFamilyName ? (
                  <div className="flex flex-1 items-center gap-2">
                    <Input
                      value={familyNameInput}
                      onChange={e => setFamilyNameInput(e.target.value)}
                      className="h-9 rounded-xl text-sm flex-1"
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') saveFamilyName(); if (e.key === 'Escape') setEditingFamilyName(false); }}
                    />
                    <Button size="sm" className="h-9 rounded-xl px-4 text-xs" onClick={saveFamilyName} disabled={savingFamilyName}>
                      {savingFamilyName ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-9 rounded-xl" onClick={() => setEditingFamilyName(false)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-1 items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-foreground">{family?.name}</div>
                      <div className="text-xs text-muted-foreground">Family name</div>
                    </div>
                    <Button size="sm" variant="outline" className="h-8 rounded-xl gap-1.5 text-xs"
                      onClick={() => { setFamilyNameInput(family?.name ?? ''); setEditingFamilyName(true); }}>
                      <Pencil className="w-3 h-3" /> Edit
                    </Button>
                  </div>
                )}
              </div>

              <FamilyMemberList />

              <Button
                variant="outline"
                className="w-full gap-2 h-10 rounded-xl text-sm font-semibold"
                onClick={() => {
                  if (import.meta.env.DEV) console.log('[Settings] invite dialog opened');
                  setInviteOpen(true);
                }}
              >
                <UserPlus className="w-4 h-4" /> Invite Member
              </Button>
            </CardContent>
          </Card>
        )}

        <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" /> Currency
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="text-xl font-black text-primary">
                  {CURRENCIES.find(c => c.code === prefs.currency)?.symbol || "$"}
                </span>
              </div>
              <div>
                <div className="text-sm font-bold text-foreground">{prefs.currency}</div>
                <div className="text-xs text-muted-foreground">{CURRENCIES.find(c => c.code === prefs.currency)?.label}</div>
              </div>
              <div className="ml-auto text-xs text-muted-foreground">Active currency</div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {CURRENCIES.map(({ code, symbol }) => {
                const isActive = prefs.currency === code;
                return (
                  <motion.button key={code} type="button"
                    whileHover={{ y: -2, scale: 1.04 }}
                    whileTap={{ scale: 0.93 }}
                    onClick={() => { setPref("currency", code); setPref("currencySymbol", symbol); }}
                    className={cn("relative flex flex-col items-center justify-center py-3 px-2 rounded-2xl border-2 transition-all gap-0.5",
                      isActive ? "border-primary bg-primary/8 shadow-md shadow-primary/15" : "border-border bg-card hover:border-primary/40")}
                  >
                    <span className={cn("text-2xl font-black leading-none", isActive ? "text-primary" : "text-foreground")}>{symbol}</span>
                    <span className="text-[11px] font-bold text-muted-foreground">{code}</span>
                    <AnimatePresence>
                      {isActive && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" /> Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6">
            <SettingRow label="Streak at risk" desc="Alert when a streak may break today">
              <Toggle value={prefs.notifyStreakRisk} onChange={v => setPref("notifyStreakRisk", v)} />
            </SettingRow>
            <SettingRow label="Chores due today" desc="Remind about pending daily tasks">
              <Toggle value={prefs.notifyChoresDue} onChange={v => setPref("notifyChoresDue", v)} />
            </SettingRow>
            <SettingRow label="Payout requests" desc="Notify when a child requests cash-out">
              <Toggle value={prefs.notifyPayoutRequest} onChange={v => setPref("notifyPayoutRequest", v)} />
            </SettingRow>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" /> App Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6">
            <SettingRow label="Dark mode" desc="Switch between light and dark appearance">
              <div className="flex items-center gap-2">
                <Sun className="w-3.5 h-3.5 text-muted-foreground" />
                <Toggle value={isDark} onChange={toggleDark} />
                <Moon className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            </SettingRow>
            <SettingRow label="Week starts on Monday" desc="Otherwise starts on Sunday">
              <Toggle value={prefs.weekStartsMonday} onChange={v => setPref("weekStartsMonday", v)} />
            </SettingRow>
            <SettingRow label="Show earnings on dashboard" desc="Display allowance & payout totals">
              <Toggle value={prefs.showEarningsOnDashboard} onChange={v => setPref("showEarningsOnDashboard", v)} />
            </SettingRow>
            <SettingRow label="Compact mode" desc="Reduce card padding and spacing">
              <Toggle value={prefs.compactMode} onChange={v => setPref("compactMode", v)} />
            </SettingRow>
            <SettingRow label="Sound effects" desc="Play sounds on check-in and completions">
              <Toggle value={prefs.soundEffects} onChange={v => setPref("soundEffects", v)} />
            </SettingRow>
          </CardContent>
        </Card>

        <Button className="w-full gap-2 h-11 text-base font-semibold rounded-xl" onClick={handleSave}>
          {saved ? <Check className="w-4 h-4" /> : null}
          {saved ? "Saved!" : "Save Settings"}
        </Button>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <LogOut className="w-4 h-4 text-destructive" /> Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="gap-2 h-11 rounded-xl font-semibold text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive"
              onClick={() => {
                if (import.meta.env.DEV) console.log('[Settings] sign-out triggered');
                signOut();
              }}
            >
              <LogOut className="w-4 h-4" /> Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
