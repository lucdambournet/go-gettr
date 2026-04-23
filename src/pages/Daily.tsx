import { useState, useMemo, useRef } from "react";
import { entities } from "@/api/entities";
import { type Profile, type Chore, type ChoreLog, type Streak } from "@/types/entities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Sun, Sparkles, DollarSign, Trophy, Star } from "lucide-react";
import PersonAvatar from "@/components/shared/PersonAvatar";
import AnimatedProgress from "@/components/shared/AnimatedProgress";
import { getWeekStart, formatDate } from "@/components/shared/weekUtils";
import { getChoreIcon } from "@/components/chores/ChoreDialog";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { soundComplete, soundUncomplete } from "@/lib/useSound";
import StampAnimation from "@/components/chores/StampAnimation";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { useToast } from "@/components/ui/use-toast";

const DAY_KEY_MAP = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function getTodayChores(chores: Chore[], today: Date): Chore[] {
  const todayKey = DAY_KEY_MAP[today.getDay()];
  return chores.filter((c) => {
    if (!c.active) return false;
    const freq = c.frequency || "weekly";
    if (freq === "daily" || freq === "weekly" || freq === "twice_daily") return true;
    const raw = freq.startsWith("2x:") ? freq.slice(3) : freq;
    return raw.split(",").map(d => d.trim()).includes(todayKey);
  });
}

function CompletionBurst({ x, y }: { x: number; y: number }) {
  const colors = ["#f59e0b", "#6366f1", "#10b981", "#ec4899", "#f97316", "#06b6d4"];
  return (
    <div className="fixed pointer-events-none z-50" style={{ left: x, top: y }}>
      {Array.from({ length: 10 }).map((_, i) => {
        const angle = (i / 10) * Math.PI * 2;
        const dist = 40 + Math.random() * 40;
        return (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{ background: colors[i % colors.length] }}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            animate={{
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist - 20,
              scale: 0,
              opacity: 0,
            }}
            transition={{ duration: 0.6 + Math.random() * 0.3, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
}

interface ChoreCardProps {
  chore: Chore;
  isCompleted: boolean;
  onToggle: (chore: Chore) => void;
  personName: string;
  personColor: number;
  personAvatarColor?: string;
  index: number;
}

function ChoreCard({ chore, isCompleted, onToggle, personName, personColor, personAvatarColor, index }: ChoreCardProps) {
  const ChoreIcon = getChoreIcon(chore.icon);
  const hasPayout = (chore.payout_per_completion ?? 0) > 0;
  const isTwiceDaily = chore.frequency === "twice_daily" || chore.frequency?.startsWith("2x:");
  const [burst, setBurst] = useState<{ x: number; y: number } | null>(null);
  const [cardRect, setCardRect] = useState<DOMRect | null>(null);
  const [showStamp, setShowStamp] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleToggle = (e: React.MouseEvent) => {
    if (!isCompleted) {
      soundComplete();
      if (cardRef.current) {
        setCardRect(cardRef.current.getBoundingClientRect());
      }
      setShowStamp(true);
      const rect = e.currentTarget.getBoundingClientRect();
      setBurst({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      setTimeout(() => setBurst(null), 900);
      setTimeout(() => setShowStamp(false), 1200);
    } else {
      soundUncomplete();
    }
    onToggle(chore);
  };

  return (
    <>
      <AnimatePresence>{burst && <CompletionBurst key="burst" x={burst.x} y={burst.y} />}</AnimatePresence>
      <AnimatePresence>{showStamp && cardRect && <StampAnimation key="stamp" cardRect={cardRect} />}</AnimatePresence>
      <motion.div
        ref={cardRef}
        layout
        initial={{ opacity: 0, y: 30, scale: 0.93 }}
        animate={{
          opacity: isCompleted ? 0.65 : 1,
          y: 0,
          scale: 1,
          transition: { delay: index * 0.05, type: "spring", stiffness: 240, damping: 22 }
        }}
        exit={{ opacity: 0, scale: 0.88, y: -16, transition: { duration: 0.2 } }}
        whileHover={!isCompleted ? { y: -5, scale: 1.02, transition: { duration: 0.15 } } : undefined}
        className={cn(
          "relative overflow-hidden rounded-2xl border bg-card shadow-sm",
          isCompleted ? "border-chart-2/30" : "hover:shadow-xl hover:border-primary/30"
        )}
      >
        <AnimatePresence>
          {isCompleted && (
            <motion.div
              initial={{ scaleX: 0, originX: 0 }}
              animate={{ scaleX: 1 }}
              exit={{ scaleX: 0, originX: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 bg-chart-2/6 pointer-events-none"
            />
          )}
        </AnimatePresence>

        <motion.div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
          animate={{ opacity: isCompleted ? 0.5 : 1 }}
          style={{
            background: isCompleted
              ? "linear-gradient(180deg, #10b981, #34d399)"
              : "linear-gradient(180deg, hsl(var(--primary)), hsl(var(--primary)/0.4))"
          }}
        />

        <div className="p-4 pl-5">
          <div className="flex items-start gap-3">
            <motion.div
              animate={isCompleted
                ? { rotate: [0, 12, 0], scale: [1, 1.2, 1] }
                : { rotate: 0, scale: 1 }
              }
              transition={isCompleted ? { duration: 0.4 } : {}}
              className={cn(
                "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0",
                isCompleted ? "bg-chart-2/15" : "bg-primary/10",
                isTwiceDaily && !isCompleted ? "ring-2 ring-offset-1 ring-offset-card" : ""
              )}
              style={isTwiceDaily && !isCompleted ? { boxShadow: "0 0 0 2px #f59e0b88, 0 0 0 3px #f59e0b22" } : {}}
            >
              <ChoreIcon className={cn("w-5 h-5", isCompleted ? "text-chart-2" : "text-primary")} />
            </motion.div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <motion.h3
                  animate={isCompleted ? { x: [0, 2, 0] } : {}}
                  className={cn("font-semibold text-sm", isCompleted ? "line-through text-muted-foreground" : "text-foreground")}
                >
                  {chore.title}
                </motion.h3>
                {isTwiceDaily && (
                  <span
                    title="Twice daily"
                    className="text-[9px] font-black px-1.5 py-0.5 rounded-md leading-none"
                    style={{
                      background: "linear-gradient(135deg, #f59e0b22, #f59e0b11)",
                      color: "#b45309",
                      border: "1px solid #f59e0b55",
                      boxShadow: "inset 0 1px 0 #fcd34d44"
                    }}
                  >
                    2×
                  </span>
                )}
                {hasPayout && (
                  <motion.div
                    animate={isCompleted ? { scale: [1, 1.2, 1] } : {}}
                    transition={isCompleted ? { duration: 0.3 } : {}}
                  >
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-[10px] font-bold gap-0.5">
                      <DollarSign className="w-2.5 h-2.5" />{(chore.payout_per_completion ?? 0).toFixed(2)}
                    </Badge>
                  </motion.div>
                )}
              </div>
              {chore.description && (
                <p className="text-xs text-muted-foreground mb-1.5 line-clamp-1">{chore.description}</p>
              )}
              <div className="flex items-center gap-1.5">
                <PersonAvatar name={personName} avatarColor={personAvatarColor} colorIndex={personColor} size="sm" />
                <span className="text-xs text-muted-foreground">{personName}</span>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.75 }}
              onClick={handleToggle}
              transition={{ type: "spring", stiffness: 500, damping: 16 }}
              className="shrink-0 mt-0.5"
            >
              <AnimatePresence mode="wait">
                {isCompleted ? (
                  <motion.div key="done"
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 90 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <CheckCircle2 className="w-7 h-7 text-chart-2 drop-shadow" />
                  </motion.div>
                ) : (
                  <motion.div key="empty"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <Circle className="w-7 h-7 text-muted-foreground/35 hover:text-primary transition-colors" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>

          <AnimatePresence>
            {!isCompleted && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.22 }}
              >
                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}>
                  <Button size="sm" className="w-full gap-2 h-9 rounded-xl font-semibold" onClick={handleToggle}>
                    <CheckCircle2 className="w-4 h-4" />
                    Mark Complete{hasPayout ? ` · +$${(chore.payout_per_completion ?? 0).toFixed(2)}` : ""}
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
}

const PERSON_COLORS = ["#6366f1", "#f59e0b", "#ec4899", "#06b6d4", "#8b5cf6", "#10b981"];

interface PersonSectionProps {
  person: Profile;
  personIndex: number;
  chores: Chore[];
  logMap: Record<string, ChoreLog | boolean | null>;
  onToggle: (chore: Chore, personId: string, dayStr: string) => void;
  todayStr: string;
}

function PersonSection({ person, personIndex, chores, logMap, onToggle, todayStr }: PersonSectionProps) {
  const today = new Date();
  const todayChores = getTodayChores(chores, today);
  const completed = todayChores.filter((c) => logMap[`${c.id}_${todayStr}`]);
  const progress = todayChores.length > 0 ? Math.round((completed.length / todayChores.length) * 100) : 0;
  const allDone = todayChores.length > 0 && completed.length === todayChores.length;
  const earnedPayout = completed.reduce((s, c) => s + (c.payout_per_completion || 0), 0);
  const accent = PERSON_COLORS[personIndex % PERSON_COLORS.length];

  if (todayChores.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: personIndex * 0.12, type: "spring", stiffness: 180 }}
      className="space-y-4"
    >
      <motion.div
        className="flex items-center gap-3 p-3 rounded-2xl border"
        style={{ borderColor: `${accent}33`, background: `${accent}08` }}
        animate={allDone ? { borderColor: [`${accent}33`, "#10b98144", `${accent}33`] } : {}}
        transition={{ duration: 2, repeat: allDone ? Infinity : 0 }}
      >
        <motion.div
          animate={allDone ? { rotate: [0, 10, -5, 0], scale: [1, 1.12, 1] } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <PersonAvatar name={person.name} avatarColor={person.avatar_color} colorIndex={personIndex} size="md" />
        </motion.div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-black text-foreground font-nunito">{person.name}</h2>
            <AnimatePresence>
              {allDone && (
                <motion.div key="trophy"
                  initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 14 }}
                >
                  <Trophy className="w-4 h-4 text-amber-400" />
                </motion.div>
              )}
            </AnimatePresence>
            {earnedPayout > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-xs font-bold">
                  +${earnedPayout.toFixed(2)} earned
                </Badge>
              </motion.div>
            )}
          </div>

          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 max-w-[180px]">
              <AnimatedProgress value={progress} height="h-2" color={`linear-gradient(90deg, ${accent}, ${accent}99)`} />
            </div>
            <motion.span
              key={progress}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-xs font-bold tabular-nums"
              style={{ color: accent }}
            >
              {completed.length}/{todayChores.length}
            </motion.span>
          </div>
        </div>

        <motion.div
          key={progress}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="text-2xl font-black tabular-nums shrink-0"
          style={{ color: accent }}
        >
          {progress}%
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {allDone && (
          <motion.div
            initial={{ opacity: 0, height: 0, scale: 0.95 }}
            animate={{ opacity: 1, height: "auto", scale: 1 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", stiffness: 260 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-chart-2/10 border border-chart-2/30 text-sm font-semibold text-chart-2">
              <motion.span
                animate={{ rotate: [0, 20, -10, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
              >
                ⭐
              </motion.span>
              All done for today — amazing job, {person.name}!
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-1">
        <AnimatePresence>
          {todayChores.map((chore, i) => (
            <ChoreCard
              key={chore.id}
              chore={chore}
              isCompleted={!!logMap[`${chore.id}_${todayStr}`]}
              onToggle={() => onToggle(chore, person.id, todayStr)}
              personName={person.name}
              personColor={personIndex}
              personAvatarColor={person.avatar_color}
              index={i}
            />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function Daily() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const today = new Date();
  const weekStart = getWeekStart(today);
  const weekStartStr = formatDate(weekStart);
  const todayStr = formatDate(today);

  const { data: people = [], isLoading: isLoadingPeople, isError: isPeopleError, error: peopleError } = useQuery({ queryKey: ["people"], queryFn: () => entities.Profile.list() as unknown as Promise<Profile[]> });
  const { data: chores = [], isLoading: isLoadingChores, isError: isChoresError, error: choresError } = useQuery({ queryKey: ["chores"], queryFn: () => entities.Chore.list() as Promise<Chore[]> });
  const { data: logs = [], isLoading: isLoadingLogs, isError: isLogsError, error: logsError } = useQuery({
    queryKey: ["choreLogs", weekStartStr],
    queryFn: () => entities.ChoreLog.filter({ week_start: weekStartStr }) as Promise<ChoreLog[]>,
  });
  const { data: streaks = [] } = useQuery({ queryKey: ["streaks"], queryFn: () => entities.Streak.list() as Promise<Streak[]> });

  const isLoading = isLoadingPeople || isLoadingChores || isLoadingLogs;
  const isError = isPeopleError || isChoresError || isLogsError;
  const error = (peopleError || choresError || logsError) as Error | null;

  const streakMap = useMemo(() => Object.fromEntries(streaks.map((s: Streak) => [s.profile_id, s])), [streaks]);

  const onMutationError = (err: Error) =>
    toast({ title: "Error", description: err.message, variant: "destructive" });

  const createLogMutation = useMutation({
    mutationFn: (data: Partial<ChoreLog>) => entities.ChoreLog.create(data) as Promise<ChoreLog>,
    onSuccess: (_, vars) => {
      if (import.meta.env.DEV) console.log('[Daily] createLogMutation success', { choreId: vars.chore_id });
      queryClient.invalidateQueries({ queryKey: ["choreLogs"] });
    },
    onError: (err, vars) => {
      if (import.meta.env.DEV) console.error('[Daily] createLogMutation error', { choreId: vars.chore_id, err });
      onMutationError(err);
    },
  });
  const deleteLogMutation = useMutation({
    mutationFn: (id: string) => entities.ChoreLog.delete(id) as unknown as Promise<void>,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["choreLogs"] }),
    onError: (err, id) => {
      if (import.meta.env.DEV) console.error('[Daily] deleteLogMutation error', { logId: id, err });
      onMutationError(err);
    },
  });
  const updateStreakMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Streak> }) => entities.Streak.update(id, data) as Promise<Streak>,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["streaks"] }),
    onError: (err, vars) => {
      if (import.meta.env.DEV) console.error('[Daily] updateStreakMutation error', { streakId: vars.id, err });
      onMutationError(err);
    },
  });
  const createStreakMutation = useMutation({
    mutationFn: (data: Partial<Streak>) => entities.Streak.create(data) as Promise<Streak>,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["streaks"] }),
    onError: (err, vars) => {
      if (import.meta.env.DEV) console.error('[Daily] createStreakMutation error', { profileId: vars.profile_id, err });
      onMutationError(err);
    },
  });

  const activePeople = people.filter((p: Profile) => p.active !== false && !p.is_parent);
  const activeChores = chores.filter((c: Chore) => c.active !== false);

  const serverLogMap = useMemo(() => {
    const map: Record<string, ChoreLog> = {};
    logs.forEach((log: ChoreLog) => { if (log.completed) map[`${log.chore_id}_${log.day}`] = log; });
    return map;
  }, [logs]);

  const [optimistic, setOptimistic] = useState<Record<string, ChoreLog | boolean | null>>({});

  const logMap = useMemo(() => {
    const map: Record<string, ChoreLog | boolean | null> = { ...serverLogMap };
    Object.entries(optimistic).forEach(([k, v]) => {
      if (v === null) delete map[k];
      else map[k] = v;
    });
    return map;
  }, [serverLogMap, optimistic]);

  const handleToggle = async (chore: Chore, personId: string, dayStr: string) => {
    const key = `${chore.id}_${dayStr}`;
    const existing = serverLogMap[key];
    if (existing) {
      if (import.meta.env.DEV) console.log('[Daily] chore toggled incomplete', { choreId: chore.id, choreName: chore.title, completed: false });
      setOptimistic(prev => ({ ...prev, [key]: null }));
      deleteLogMutation.mutate(existing.id, {
        onSettled: () => setOptimistic(prev => { const n = { ...prev }; delete n[key]; return n; }),
      });
      if ((chore.payout_per_completion ?? 0) > 0) {
        const streak = streakMap[personId];
        if (streak) {
          if (import.meta.env.DEV) console.log('[Daily] updateStreakMutation called', { streakId: streak.id, rewardDelta: -(chore.payout_per_completion ?? 0) });
          updateStreakMutation.mutate({ id: streak.id, data: { total_rewards_earned: Math.max(0, (streak.total_rewards_earned || 0) - (chore.payout_per_completion ?? 0)) } });
        }
      }
    } else {
      if (import.meta.env.DEV) console.log('[Daily] chore toggled complete', { choreId: chore.id, choreName: chore.title, completed: true });
      setOptimistic(prev => ({ ...prev, [key]: true }));
      createLogMutation.mutate(
        { chore_id: chore.id, profile_id: personId, week_start: weekStartStr, day: dayStr, completed: true },
        { onSettled: () => setOptimistic(prev => { const n = { ...prev }; delete n[key]; return n; }) }
      );
      if ((chore.payout_per_completion ?? 0) > 0) {
        const streak = streakMap[personId];
        if (streak) {
          if (import.meta.env.DEV) console.log('[Daily] updateStreakMutation called', { streakId: streak.id, rewardDelta: chore.payout_per_completion ?? 0 });
          updateStreakMutation.mutate({ id: streak.id, data: { total_rewards_earned: (streak.total_rewards_earned || 0) + (chore.payout_per_completion ?? 0) } });
        } else {
          createStreakMutation.mutate({ profile_id: personId, current_streak: 0, longest_streak: 0, last_checkin_date: null, total_rewards_earned: chore.payout_per_completion ?? 0 });
        }
      }
    }
  };

  const todayStats = useMemo(() => {
    let total = 0, done = 0;
    activePeople.forEach((person: Profile) => {
      const pChores = activeChores.filter((c: Chore) => c.assigned_to === person.id);
      const tChores = getTodayChores(pChores, today);
      total += tChores.length;
      done += tChores.filter((c: Chore) => logMap[`${c.id}_${todayStr}`]).length;
    });
    return { total, done, progress: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [activePeople, activeChores, logMap, todayStr]);

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorAlert error={error} />;

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dayLabel = `${dayNames[today.getDay()]}, ${monthNames[today.getMonth()]} ${today.getDate()}`;
  const allDoneToday = todayStats.total > 0 && todayStats.done === todayStats.total;

  return (
    <div className="space-y-6">
      <div className="relative -mx-4 md:-mx-8 -mt-4 md:-mt-8 px-4 md:px-8 pt-8 md:pt-10 pb-6 mb-2 overflow-visible"
        style={{ background: "linear-gradient(135deg, #f59e0b28 0%, #f59e0b10 60%, transparent 100%)" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 10% 50%, #f59e0b1e 0%, transparent 70%)" }} />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <motion.div
                animate={{ rotate: [0, 20, -10, 0], scale: [1, 1.2, 1] }}
                transition={{ delay: 0.4, duration: 0.7, ease: "easeInOut", repeat: Infinity, repeatDelay: 6 }}
              >
                <Sun className="w-6 h-6 text-amber-400" />
              </motion.div>
              <h1 className="text-3xl font-black text-foreground font-nunito tracking-tight">Today's Chores</h1>
            </div>
            <p className="text-sm text-muted-foreground">{dayLabel}</p>
          </div>

          {todayStats.total > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 220 }}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-2xl border min-w-[220px]",
                allDoneToday ? "bg-chart-2/10 border-chart-2/30" : "bg-card border-border"
              )}
            >
              <AnimatePresence mode="wait">
                {allDoneToday ? (
                  <motion.div key="done" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}>
                    <Sparkles className="w-4 h-4 text-chart-2" />
                  </motion.div>
                ) : (
                  <motion.div key="sun" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                    <Star className="w-4 h-4 text-amber-400" />
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-foreground mb-1.5">
                  {allDoneToday ? "All done! 🎉" : `${todayStats.done} / ${todayStats.total} tasks done`}
                </div>
                <AnimatedProgress value={todayStats.progress} height="h-2" showGlow />
              </div>
              <motion.span
                key={todayStats.progress}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-sm font-black tabular-nums text-foreground"
              >
                {todayStats.progress}%
              </motion.span>
            </motion.div>
          )}
        </div>
      </div>

      {activePeople.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border bg-card p-16 text-center"
        >
          <motion.div
            animate={{ rotate: [0, 20, -10, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
          >
            <Sun className="w-12 h-12 mx-auto mb-4 text-amber-300" />
          </motion.div>
          <p className="text-muted-foreground">Add people and assign chores to see today's tasks.</p>
        </motion.div>
      ) : (
        <div className="space-y-8">
          {activePeople.map((person: Profile, i: number) => (
            <PersonSection
              key={person.id}
              person={person}
              personIndex={i}
              chores={activeChores.filter((c: Chore) => c.assigned_to === person.id)}
              logMap={logMap}
              onToggle={handleToggle}
              todayStr={todayStr}
            />
          ))}
        </div>
      )}
    </div>
  );
}
