// @ts-nocheck
import { useState, useMemo } from "react";
import { entities } from "@/api/entities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Terminal, DollarSign, Trash2, RefreshCw, CheckSquare, Users,
  AlertTriangle, ChevronDown, ChevronUp, Database, RotateCcw, Plus
} from "lucide-react";
import PersonAvatar from "@/components/shared/PersonAvatar";
import { formatDate, getWeekStart } from "@/components/shared/weekUtils";
import { cn } from "@/lib/utils";
import AddMoneyDialog from "@/components/dev/AddMoneyDialog";

function Section({ title, icon: Icon, color = "text-primary", children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="overflow-hidden">
      <button
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-secondary/40 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center bg-secondary", color === "text-primary" ? "bg-primary/10" : color === "text-destructive" ? "bg-destructive/10" : "bg-amber-500/10")}>
          <Icon className={cn("w-4 h-4", color)} />
        </div>
        <span className="font-bold text-sm text-foreground flex-1">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <CardContent className="pt-0 pb-4 px-4 space-y-3">
              {children}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function LogLine({ msg, type = "info" }) {
  const colors = { info: "text-muted-foreground", success: "text-emerald-500", error: "text-destructive", warn: "text-amber-500" };
  return <div className={cn("text-xs font-mono", colors[type])}>{msg}</div>;
}

export default function DevPanel() {
  const queryClient = useQueryClient();
  const [log, setLog] = useState([]);
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [busy, setBusy] = useState(false);

  const addLog = (msg, type = "info") => setLog(prev => [{ msg: `[${new Date().toLocaleTimeString()}] ${msg}`, type }, ...prev].slice(0, 50));

  const { data: people = [] } = useQuery({ queryKey: ["people"], queryFn: () => entities.Profile.list() });
  const { data: streaks = [] } = useQuery({ queryKey: ["streaks"], queryFn: () => entities.Streak.list() });
  const { data: choreLogs = [] } = useQuery({ queryKey: ["allChoreLogs"], queryFn: () => entities.ChoreLog.list() });
  const { data: payouts = [] } = useQuery({ queryKey: ["payouts"], queryFn: () => entities.Payout.list() });

  const streakMap = useMemo(() => Object.fromEntries(streaks.map(s => [s.profile_id, s])), [streaks]);
  const activePeople = people.filter(p => p.active !== false);
  const kids = activePeople.filter(p => !p.is_parent);

  const updateStreak = useMutation({
    mutationFn: ({ id, data }) => entities.Streak.update(id, data),
  });
  const createStreak = useMutation({
    mutationFn: (data) => entities.Streak.create(data),
  });
  const deleteChoreLog = useMutation({
    mutationFn: (id) => entities.ChoreLog.delete(id),
  });
  const deletePayout = useMutation({
    mutationFn: (id) => entities.Payout.delete(id),
  });
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["streaks"] });
    queryClient.invalidateQueries({ queryKey: ["payouts"] });
    queryClient.invalidateQueries({ queryKey: ["choreLogs"] });
    queryClient.invalidateQueries({ queryKey: ["allChoreLogs"] });
    queryClient.invalidateQueries({ queryKey: ["people"] });
  };

  // ── Add money to a person's bank ──────────────────────────────────────────
  const handleAddMoney = async (person, amount, note) => {
    setBusy(true);
    try {
      const streak = streakMap[person.id];
      const newTotal = (streak?.total_rewards_earned || 0) + amount;
      if (streak) {
        await updateStreak.mutateAsync({ id: streak.id, data: { total_rewards_earned: newTotal } });
      } else {
        await createStreak.mutateAsync({ profile_id: person.id, current_streak: 0, longest_streak: 0, last_checkin_date: null, total_rewards_earned: amount });
      }
      const noteStr = note ? ` (${note})` : "";
      addLog(`Added $${amount.toFixed(2)} to ${person.name}'s bank${noteStr}`, "success");
      await new Promise(resolve => setTimeout(resolve, 100));
      invalidateAll();
    } catch (e) {
      addLog(`Error adding money: ${e.message}`, "error");
    } finally {
      setBusy(false);
    }
  };

  // ── Add weekly allowance for all kids ─────────────────────────────────────
  const handleAddAllowances = async () => {
    setBusy(true);
    try {
      for (const person of kids) {
        if (!person.weekly_allowance || person.weekly_allowance <= 0) continue;
        // Refetch fresh streak data for each iteration
        const freshStreaks = await entities.Streak.list();
        const freshStreak = freshStreaks.find(s => s.profile_id === person.id);
        const newAmount = (freshStreak?.total_rewards_earned || 0) + person.weekly_allowance;
        if (freshStreak) {
          await updateStreak.mutateAsync({ id: freshStreak.id, data: { total_rewards_earned: newAmount } });
        } else {
          await createStreak.mutateAsync({ profile_id: person.id, current_streak: 0, longest_streak: 0, last_checkin_date: null, total_rewards_earned: person.weekly_allowance });
        }
        addLog(`Credited $${person.weekly_allowance.toFixed(2)} weekly allowance to ${person.name}`, "success");
      }
      await new Promise(resolve => setTimeout(resolve, 150));
      invalidateAll();
      addLog("Weekly allowances distributed!", "success");
    } catch (e) {
      addLog(`Error distributing allowances: ${e.message}`, "error");
    } finally {
      setBusy(false);
    }
  };

  // ── Clear all chore check-marks for this week ─────────────────────────────
  const handleClearWeekLogs = async () => {
    setBusy(true);
    const weekStart = formatDate(getWeekStart());
    const thisWeek = choreLogs.filter(l => l.week_start === weekStart);
    addLog(`Clearing ${thisWeek.length} chore logs for current week…`, "warn");
    for (const log of thisWeek) {
      await deleteChoreLog.mutateAsync(log.id);
    }
    invalidateAll();
    setBusy(false);
    addLog(`Cleared ${thisWeek.length} logs`, "success");
  };

  // ── Clear ALL chore logs ──────────────────────────────────────────────────
  const handleClearAllLogs = async () => {
    setBusy(true);
    addLog(`Clearing ALL ${choreLogs.length} chore logs…`, "warn");
    for (const log of choreLogs) {
      await deleteChoreLog.mutateAsync(log.id);
    }
    invalidateAll();
    setBusy(false);
    addLog(`Cleared all logs`, "success");
  };

  // ── Reset all banks (set total_rewards_earned to 0) ───────────────────────
  const handleResetBanks = async () => {
    setBusy(true);
    for (const streak of streaks) {
      await updateStreak.mutateAsync({ id: streak.id, data: { total_rewards_earned: 0 } });
    }
    invalidateAll();
    setBusy(false);
    addLog("All bank balances reset to $0", "warn");
  };

  // ── Clear pending payouts ─────────────────────────────────────────────────
  const handleClearPendingPayouts = async () => {
    setBusy(true);
    const pending = payouts.filter(p => p.status === "pending");
    for (const p of pending) {
      await deletePayout.mutateAsync(p.id);
    }
    invalidateAll();
    setBusy(false);
    addLog(`Deleted ${pending.length} pending payouts`, "success");
  };

  // ── Reset all streaks to 0 ────────────────────────────────────────────────
  const handleResetStreaks = async () => {
    setBusy(true);
    for (const streak of streaks) {
      await updateStreak.mutateAsync({ id: streak.id, data: { current_streak: 0, longest_streak: streak.longest_streak || 0, last_checkin_date: null } });
    }
    invalidateAll();
    setBusy(false);
    addLog("All current streaks reset", "warn");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center">
            <Terminal className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground font-nunito flex items-center gap-2">
              Developer Panel
              <Badge className="bg-amber-500/15 text-amber-600 border-amber-400/30 border text-[10px] font-bold">DEV</Badge>
            </h1>
            <p className="text-sm text-muted-foreground">Testing & data management tools</p>
          </div>
        </div>
      </motion.div>

      <AddMoneyDialog
        open={showAddMoney}
        onOpenChange={setShowAddMoney}
        kids={kids}
        onAdd={handleAddMoney}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-4">

          {/* Add money to individual people */}
          <Section title="Add Money to Banks" icon={DollarSign}>
            <p className="text-xs text-muted-foreground">Directly credit a child's available bank balance.</p>
            <Button
              className="w-full gap-2 h-10 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-600 text-white border-0"
              onClick={() => setShowAddMoney(true)}
              disabled={busy}
            >
              <Plus className="w-4 h-4" /> Add Money…
            </Button>
          </Section>

          {/* Weekly allowance */}
          <Section title="Allowances" icon={RefreshCw} color="text-emerald-500">
            <p className="text-xs text-muted-foreground">Credit each kid's weekly allowance into their bank right now.</p>
            <div className="space-y-1.5">
              {kids.map((person, i) => (
                <div key={person.id} className="flex items-center gap-2 text-xs">
                  <PersonAvatar name={person.name} avatarColor={person.avatar_color} colorIndex={i} size="sm" />
                  <span className="text-foreground font-medium">{person.name}</span>
                  <span className="text-muted-foreground ml-auto">
                    {person.weekly_allowance > 0 ? `$${person.weekly_allowance.toFixed(2)}/wk` : "no allowance set"}
                  </span>
                </div>
              ))}
            </div>
            <Button className="w-full gap-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-9"
              onClick={handleAddAllowances} disabled={busy}>
              <DollarSign className="w-4 h-4" /> Credit All Weekly Allowances
            </Button>
          </Section>

        </div>

        <div className="space-y-4">

          {/* Chore log management */}
          <Section title="Chore Logs" icon={CheckSquare} color="text-amber-500">
            <p className="text-xs text-muted-foreground">
              Total logs in DB: <strong>{choreLogs.length}</strong> &nbsp;|&nbsp;
              This week: <strong>{choreLogs.filter(l => l.week_start === formatDate(getWeekStart())).length}</strong>
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 gap-1.5 h-9 text-xs rounded-xl border-amber-400/50 text-amber-600 hover:bg-amber-50"
                onClick={handleClearWeekLogs} disabled={busy}>
                <Trash2 className="w-3.5 h-3.5" /> Clear This Week
              </Button>
              <Button variant="outline" className="flex-1 gap-1.5 h-9 text-xs rounded-xl border-destructive/40 text-destructive hover:bg-destructive/5"
                onClick={handleClearAllLogs} disabled={busy}>
                <Trash2 className="w-3.5 h-3.5" /> Clear ALL Logs
              </Button>
            </div>
          </Section>

          {/* Bank / streak management */}
          <Section title="Banks & Streaks" icon={Database} color="text-destructive">
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                Payout records: <strong>{payouts.length}</strong> &nbsp;|&nbsp;
                Pending: <strong>{payouts.filter(p => p.status === "pending").length}</strong>
              </div>
              <Button variant="outline" className="w-full gap-2 h-9 text-xs rounded-xl border-amber-400/40 text-amber-600 hover:bg-amber-50"
                onClick={handleClearPendingPayouts} disabled={busy}>
                <RotateCcw className="w-3.5 h-3.5" /> Clear Pending Payouts
              </Button>
              <Button variant="outline" className="w-full gap-2 h-9 text-xs rounded-xl border-destructive/40 text-destructive hover:bg-destructive/5"
                onClick={handleResetBanks} disabled={busy}>
                <Trash2 className="w-3.5 h-3.5" /> Reset All Bank Balances to $0
              </Button>
              <Button variant="outline" className="w-full gap-2 h-9 text-xs rounded-xl border-destructive/40 text-destructive hover:bg-destructive/5"
                onClick={handleResetStreaks} disabled={busy}>
                <Trash2 className="w-3.5 h-3.5" /> Reset All Current Streaks
              </Button>
            </div>
          </Section>

          {/* Quick stats */}
          <Section title="Current State" icon={Users} color="text-primary">
            <div className="space-y-1.5">
              {kids.map((person, i) => {
                const streak = streakMap[person.id];
                const balance = streak?.total_rewards_earned || 0;
                const paid = payouts.filter(p => p.profile_id === person.id && p.status === "paid").reduce((s, p) => s + p.amount, 0);
                const pending = payouts.filter(p => p.profile_id === person.id && p.status === "pending").reduce((s, p) => s + p.amount, 0);
                const available = Math.max(0, balance - paid - pending);
                return (
                  <div key={person.id} className="flex items-center gap-2 text-xs py-1.5 border-b border-border/50 last:border-0">
                    <PersonAvatar name={person.name} avatarColor={person.avatar_color} colorIndex={i} size="sm" />
                    <span className="font-medium text-foreground">{person.name}</span>
                    <span className="ml-auto text-emerald-600 font-bold">avail: ${available.toFixed(2)}</span>
                    <span className="text-muted-foreground">earned: ${balance.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          </Section>

        </div>
      </div>

      {/* Activity log */}
      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Terminal className="w-4 h-4 text-primary" /> Activity Log
            <button className="ml-auto text-xs text-muted-foreground hover:text-foreground" onClick={() => setLog([])}>clear</button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="bg-black/80 rounded-xl p-3 min-h-[80px] max-h-[200px] overflow-y-auto font-mono space-y-0.5">
            {log.length === 0 ? (
              <div className="text-xs text-muted-foreground font-mono">Waiting for actions…</div>
            ) : (
              log.map((l, i) => <LogLine key={i} msg={l.msg} type={l.type} />)
            )}
          </div>
        </CardContent>
      </Card>

      {/* Warning footer */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/8 border border-amber-400/30 text-xs text-amber-700">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>This panel directly modifies production data. Actions are irreversible — use with care during testing only.</span>
      </div>
    </div>
  );
}
