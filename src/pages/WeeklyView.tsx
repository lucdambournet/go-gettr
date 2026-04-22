import { useState, useMemo } from "react";
import { entities } from "@/api/entities";
import { type Profile, type Chore, type ChoreLog, type Streak } from "@/types/entities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Calendar, Trophy, CheckCircle2, Circle } from "lucide-react";
import PersonAvatar from "@/components/shared/PersonAvatar";
import {
  getWeekStart, getWeekDays, formatDate, formatWeekLabel,
  getPrevWeek, getNextWeek, getDayName, getChoreSchedule, choreWeekStats
} from "@/components/shared/weekUtils";
import { getChoreIcon } from "@/components/chores/ChoreDialog";
import { format, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type LogMapValue = ChoreLog | boolean | null;
type LogMap = Record<string, LogMapValue>;

interface WeekNavProps {
  weekStart: Date;
  weekDir: number;
  onPrev: () => void;
  onNext: () => void;
}

function WeekNav({ weekStart, weekDir, onPrev, onNext }: WeekNavProps) {
  const weekStartStr = formatDate(weekStart);
  return (
    <div className="flex items-center gap-2">
      <motion.div whileHover={{ x: -2 }} whileTap={{ scale: 0.88 }}>
        <Button variant="outline" size="icon" onClick={onPrev} className="h-8 w-8">
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </motion.div>
      <AnimatePresence mode="wait">
        <motion.span
          key={weekStartStr}
          initial={{ opacity: 0, y: weekDir > 0 ? 8 : -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: weekDir > 0 ? -8 : 8 }}
          transition={{ duration: 0.18 }}
          className="text-sm font-medium text-foreground min-w-[170px] text-center inline-block"
        >
          {formatWeekLabel(weekStart)}
        </motion.span>
      </AnimatePresence>
      <motion.div whileHover={{ x: 2 }} whileTap={{ scale: 0.88 }}>
        <Button variant="outline" size="icon" onClick={onNext} className="h-8 w-8">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </motion.div>
    </div>
  );
}

function DayHeader({ day }: { day: Date }) {
  const today = isToday(day);
  return (
    <th className={cn("text-center py-2 px-1 min-w-[44px]", today ? "text-primary" : "text-muted-foreground")}>
      <div className="text-[10px] font-semibold uppercase tracking-wide">{getDayName(day)}</div>
      <div className={cn(
        "text-xs mt-0.5 w-6 h-6 mx-auto flex items-center justify-center rounded-full font-medium",
        today && "bg-primary text-primary-foreground"
      )}>
        {format(day, "d")}
      </div>
    </th>
  );
}

interface ChoreRowProps {
  chore: Chore;
  weekDays: Date[];
  logMap: LogMap;
  optimistic: LogMap;
  onToggle: (choreId: string, personId: string, dayStr: string) => void;
  personId: string;
}

function ChoreRow({ chore, weekDays, logMap, optimistic, onToggle, personId }: ChoreRowProps) {
  const ChoreIcon = getChoreIcon(chore.icon);
  const { activeDays, isLegacyWeekly } = getChoreSchedule(chore, weekDays);
  const activeDayStrs = new Set(activeDays.map(formatDate));

  const effectiveLogMap: LogMap = { ...logMap };
  Object.entries(optimistic).forEach(([k, v]) => {
    if (v === true) effectiveLogMap[k] = true;
    else delete effectiveLogMap[k];
  });
  const { expected, done } = choreWeekStats(chore, weekDays, effectiveLogMap);
  const allDone = expected > 0 && done >= expected;

  const anyCheckedDay = isLegacyWeekly
    ? weekDays.find((d) => effectiveLogMap[`${chore.id}_${formatDate(d)}`])
    : null;

  return (
    <tr className="border-b border-border/40 last:border-0">
      <td className="py-2.5 pr-3 min-w-[130px]">
        <div className="flex items-center gap-2">
          <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0",
            allDone ? "bg-chart-2/20" : "bg-primary/10")}
          >
            <ChoreIcon className={cn("w-3 h-3", allDone ? "text-chart-2" : "text-primary")} />
          </div>
          <div className="min-w-0">
            <div className={cn("text-xs font-medium truncate", allDone && "line-through text-muted-foreground")}>
              {chore.title}
              {(chore.payout_per_completion ?? 0) > 0 && (
                <span className="ml-1 text-[9px] font-semibold text-chart-2 bg-chart-2/10 px-1 py-0.5 rounded">
                  +${(chore.payout_per_completion ?? 0).toFixed(2)}
                </span>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground">{done}/{expected}</div>
          </div>
        </div>
      </td>

      {weekDays.map((day) => {
        const dayStr = formatDate(day);
        const isActive = activeDayStrs.has(dayStr);
        const isChecked = !!effectiveLogMap[`${chore.id}_${dayStr}`];
        const isDisabled = !isActive || (isLegacyWeekly && anyCheckedDay && formatDate(anyCheckedDay) !== dayStr && !isChecked);

        return (
          <td key={dayStr} className="text-center py-2.5 px-1">
            {isActive ? (
              <button
                onClick={() => !isDisabled && onToggle(chore.id, personId, dayStr)}
                disabled={!!isDisabled}
                className={cn(
                  "w-7 h-7 mx-auto flex items-center justify-center rounded-full transition-transform active:scale-75",
                  !isDisabled && "hover:scale-110"
                )}
              >
                {isChecked ? (
                  <CheckCircle2 className="w-5 h-5 text-chart-2 drop-shadow-sm" />
                ) : (
                  <Circle className={cn("w-5 h-5", isDisabled ? "text-border" : "text-muted-foreground/40 hover:text-muted-foreground")} />
                )}
              </button>
            ) : (
              <div className="w-7 h-7 mx-auto flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-border/60" />
              </div>
            )}
          </td>
        );
      })}
    </tr>
  );
}

interface PersonSectionProps {
  person: Profile;
  personIndex: number;
  chores: Chore[];
  weekDays: Date[];
  logMap: LogMap;
  optimistic: LogMap;
  onToggle: (choreId: string, personId: string, dayStr: string) => void;
}

function PersonSection({ person, personIndex, chores, weekDays, logMap, optimistic, onToggle }: PersonSectionProps) {
  const [collapsed, setCollapsed] = useState(false);

  const effectiveLogMap = useMemo(() => {
    const m: LogMap = { ...logMap };
    Object.entries(optimistic).forEach(([k, v]) => {
      if (v === true) m[k] = true;
      else delete m[k];
    });
    return m;
  }, [logMap, optimistic]);

  const stats = useMemo(() => {
    let expected = 0, done = 0;
    chores.forEach((chore) => {
      const s = choreWeekStats(chore, weekDays, effectiveLogMap);
      expected += s.expected;
      done += s.done;
    });
    return { expected, done, progress: expected > 0 ? Math.round((done / expected) * 100) : 0 };
  }, [chores, weekDays, effectiveLogMap]);

  const allComplete = stats.expected > 0 && stats.done >= stats.expected;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: personIndex * 0.07, duration: 0.35, type: "spring", stiffness: 180 }}
    >
      <Card className={cn(
        "overflow-hidden transition-all duration-500",
        allComplete && "ring-2 ring-chart-2/50 shadow-lg shadow-chart-2/10"
      )}>
        <motion.button
          className="w-full text-left"
          onClick={() => setCollapsed((v) => !v)}
          whileHover={{ backgroundColor: "hsl(var(--secondary)/0.4)" }}
          transition={{ duration: 0.15 }}
        >
          <CardHeader className="pb-3 pt-4">
            <div className="flex items-center gap-3">
              <motion.div whileHover={{ scale: 1.08 }} transition={{ type: "spring", stiffness: 350 }}>
                <PersonAvatar name={person.name} avatarColor={person.avatar_color} colorIndex={personIndex} />
              </motion.div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-semibold">{person.name}</CardTitle>
                  {allComplete && (
                    <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 300 }}>
                      <Trophy className="w-4 h-4 text-amber-500" />
                    </motion.div>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 max-w-[160px]">
                    <Progress value={stats.progress} className="h-1.5" />
                  </div>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {stats.done}/{stats.expected}
                  </span>
                  <span className="text-[11px] font-semibold text-foreground tabular-nums">
                    {stats.progress}%
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <AnimatePresence mode="wait">
                  {allComplete && (person.weekly_allowance ?? 0) > 0 ? (
                    <motion.div key="earned"
                      initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}
                      transition={{ type: "spring", stiffness: 280 }}>
                      <Badge className="bg-chart-2 text-white border-0 text-xs">
                        ✓ ${(person.weekly_allowance || 0).toFixed(2)}
                      </Badge>
                    </motion.div>
                  ) : (person.weekly_allowance ?? 0) > 0 ? (
                    <motion.div key="possible" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Badge variant="secondary" className="text-[10px] text-muted-foreground">
                        ${(person.weekly_allowance || 0).toFixed(2)}
                      </Badge>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
                <motion.div
                  animate={{ rotate: collapsed ? -90 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-muted-foreground"
                >
                  <ChevronRight className="w-4 h-4" />
                </motion.div>
              </div>
            </div>
          </CardHeader>
        </motion.button>

        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              style={{ overflow: "hidden" }}
            >
              <CardContent className="pt-0 pb-4">
                {chores.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 pl-1">No chores assigned yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/60">
                          <th className="text-left py-2 pr-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground min-w-[130px]">
                            Chore
                          </th>
                          {weekDays.map((day) => <DayHeader key={formatDate(day)} day={day} />)}
                        </tr>
                      </thead>
                      <tbody>
                        {chores.map((chore) => (
                          <ChoreRow
                            key={chore.id}
                            chore={chore}
                            weekDays={weekDays}
                            logMap={logMap}
                            optimistic={optimistic}
                            onToggle={onToggle}
                            personId={person.id}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

export default function WeeklyView() {
  const [weekStart, setWeekStart] = useState(getWeekStart());
  const [weekDir, setWeekDir] = useState(1);
  const [optimistic, setOptimistic] = useState<LogMap>({});
  const weekDays = getWeekDays(weekStart);
  const weekStartStr = formatDate(weekStart);
  const queryClient = useQueryClient();

  const { data: people = [] } = useQuery({ queryKey: ["people"], queryFn: () => entities.Profile.list() as unknown as Promise<Profile[]> });
  const { data: chores = [] } = useQuery({ queryKey: ["chores"], queryFn: () => entities.Chore.list() as Promise<Chore[]> });
  const { data: streaks = [] } = useQuery({ queryKey: ["streaks"], queryFn: () => entities.Streak.list() as Promise<Streak[]> });
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["choreLogs", weekStartStr],
    queryFn: () => entities.ChoreLog.filter({ week_start: weekStartStr }) as Promise<ChoreLog[]>,
  });

  const createLogMutation = useMutation({
    mutationFn: (data: Partial<ChoreLog>) => entities.ChoreLog.create(data) as Promise<ChoreLog>,
    onSuccess: (_, vars) => {
      if (import.meta.env.DEV) console.log('[WeeklyView] createLogMutation success', { choreId: vars.chore_id, day: vars.day });
      queryClient.invalidateQueries({ queryKey: ["choreLogs"] });
    },
    onError: (err, vars) => {
      if (import.meta.env.DEV) console.error('[WeeklyView] createLogMutation error', { choreId: vars.chore_id, day: vars.day, err });
    },
  });
  const deleteLogMutation = useMutation({
    mutationFn: (id: string) => entities.ChoreLog.delete(id) as unknown as Promise<void>,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["choreLogs"] }),
    onError: (err, id) => {
      if (import.meta.env.DEV) console.error('[WeeklyView] deleteLogMutation error', { logId: id, err });
    },
  });
  const updateStreakMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Streak> }) => entities.Streak.update(id, data) as Promise<Streak>,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["streaks"] }),
    onError: (err, vars) => {
      if (import.meta.env.DEV) console.error('[WeeklyView] updateStreakMutation error', { streakId: vars.id, err });
    },
  });
  const createStreakMutation = useMutation({
    mutationFn: (data: Partial<Streak>) => entities.Streak.create(data) as Promise<Streak>,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["streaks"] }),
    onError: (err, vars) => {
      if (import.meta.env.DEV) console.error('[WeeklyView] createStreakMutation error', { profileId: vars.profile_id, err });
    },
  });

  const streakMap = useMemo(() => Object.fromEntries(streaks.map((s: Streak) => [s.profile_id, s])), [streaks]);

  const activePeople = people.filter((p: Profile) => p.active !== false && !p.is_parent);
  const activeChores = chores.filter((c: Chore) => c.active !== false);

  const logMap = useMemo(() => {
    const map: LogMap = {};
    logs.forEach((log: ChoreLog) => { if (log.completed) map[`${log.chore_id}_${log.day}`] = log; });
    return map;
  }, [logs]);

  const effectiveOptimistic = useMemo(() => optimistic, [optimistic]);

  const handleToggle = (choreId: string, personId: string, dayStr: string) => {
    const key = `${choreId}_${dayStr}`;
    const existing = logMap[key] as ChoreLog | undefined;
    const chore = activeChores.find((c: Chore) => c.id === choreId);
    if (existing && typeof existing === "object" && "id" in existing) {
      if (import.meta.env.DEV) console.log('[WeeklyView] chore toggled incomplete', { choreId, date: dayStr, completed: false });
      setOptimistic((prev) => { const n = { ...prev }; delete n[key]; return { ...n, [key]: null }; });
      deleteLogMutation.mutate(existing.id, {
        onSettled: () => setOptimistic((prev) => { const n = { ...prev }; delete n[key]; return n; }),
      });
      if ((chore?.payout_per_completion ?? 0) > 0) {
        const streak = streakMap[personId];
        if (streak) {
          updateStreakMutation.mutate({ id: streak.id, data: { total_rewards_earned: Math.max(0, (streak.total_rewards_earned || 0) - (chore?.payout_per_completion ?? 0)) } });
        }
      }
    } else {
      if (import.meta.env.DEV) console.log('[WeeklyView] chore toggled complete', { choreId, date: dayStr, completed: true });
      setOptimistic((prev) => ({ ...prev, [key]: true }));
      createLogMutation.mutate({ chore_id: choreId, profile_id: personId, week_start: weekStartStr, day: dayStr, completed: true }, {
        onSettled: () => setOptimistic((prev) => { const n = { ...prev }; delete n[key]; return n; }),
      });
      if ((chore?.payout_per_completion ?? 0) > 0) {
        const streak = streakMap[personId];
        if (streak) {
          updateStreakMutation.mutate({ id: streak.id, data: { total_rewards_earned: (streak.total_rewards_earned || 0) + (chore?.payout_per_completion ?? 0) } });
        } else {
          createStreakMutation.mutate({ profile_id: personId, current_streak: 0, longest_streak: 0, last_checkin_date: null, total_rewards_earned: chore?.payout_per_completion ?? 0 });
        }
      }
    }
  };

  const handlePrev = () => {
    const newWeekStart = getPrevWeek(weekStart);
    if (import.meta.env.DEV) console.log('[WeeklyView] getPrevWeek called', { newWeekStart: formatDate(newWeekStart) });
    setWeekDir(-1);
    setWeekStart(newWeekStart);
    setOptimistic({});
  };
  const handleNext = () => {
    const newWeekStart = getNextWeek(weekStart);
    if (import.meta.env.DEV) console.log('[WeeklyView] getNextWeek called', { newWeekStart: formatDate(newWeekStart) });
    setWeekDir(1);
    setWeekStart(newWeekStart);
    setOptimistic({});
  };

  const effectiveLogMap = useMemo(() => {
    const m: LogMap = { ...logMap };
    Object.entries(optimistic).forEach(([k, v]) => {
      if (v === true) m[k] = true;
      else delete m[k];
    });
    return m;
  }, [logMap, optimistic]);

  const overallStats = useMemo(() => {
    let expected = 0, done = 0;
    activeChores.forEach((chore: Chore) => {
      const s = choreWeekStats(chore, weekDays, effectiveLogMap);
      expected += s.expected;
      done += s.done;
    });
    return { expected, done, progress: expected > 0 ? Math.round((done / expected) * 100) : 0 };
  }, [activeChores, weekDays, effectiveLogMap]);

  return (
    <div>
      <div className="relative -mx-4 md:-mx-8 -mt-4 md:-mt-8 px-4 md:px-8 pt-8 md:pt-10 pb-6 mb-6 overflow-visible"
        style={{ background: "linear-gradient(135deg, #8b5cf628 0%, #8b5cf610 60%, transparent 100%)" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 0%, #8b5cf61e 0%, transparent 65%)" }} />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative">
          <div>
            <h1 className="text-3xl font-black text-foreground tracking-tight font-nunito">Weekly View</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Track chore completion day by day</p>
          </div>
          <WeekNav weekStart={weekStart} weekDir={weekDir} onPrev={handlePrev} onNext={handleNext} />
        </div>
      </div>

      <div className="flex gap-5">
        <div className="flex-1 min-w-0">
          {activePeople.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Add people and chores to start tracking.</p>
              </CardContent>
            </Card>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={weekStartStr}
                initial={{ opacity: 0, x: weekDir * 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: weekDir * -30 }}
                transition={{ duration: 0.22, ease: "easeInOut" }}
                className="space-y-4"
              >
                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                      className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : (
                  activePeople.map((person: Profile, pi: number) => (
                    <PersonSection
                      key={person.id}
                      person={person}
                      personIndex={pi}
                      chores={activeChores.filter((c: Chore) => c.assigned_to === person.id)}
                      weekDays={weekDays}
                      logMap={logMap}
                      optimistic={effectiveOptimistic}
                      onToggle={handleToggle}
                    />
                  ))
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {activePeople.length > 0 && activeChores.length > 0 && (
          <div className="hidden md:flex flex-col items-center gap-3 w-14 shrink-0 pt-1">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center leading-tight">Week</div>
            <div className="relative flex-1 w-4 bg-secondary rounded-full overflow-hidden min-h-[120px]">
              <motion.div
                className="absolute bottom-0 left-0 right-0 rounded-full"
                style={{ background: "linear-gradient(180deg, #8b5cf6, #6366f1)" }}
                initial={{ height: "0%" }}
                animate={{ height: `${overallStats.progress}%` }}
                transition={{ type: "spring", stiffness: 80, damping: 18 }}
              />
              <motion.div
                className="absolute inset-x-0 h-6 bg-white/20 rounded-full"
                animate={{ bottom: [`${overallStats.progress}%`, `${Math.min(overallStats.progress + 8, 100)}%`, `${overallStats.progress}%`] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                style={{ bottom: `${overallStats.progress}%` }}
              />
            </div>
            <motion.div
              key={overallStats.progress}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="text-sm font-black text-foreground tabular-nums"
            >
              {overallStats.progress}%
            </motion.div>
            <div className="text-[9px] text-muted-foreground text-center tabular-nums leading-tight">
              {overallStats.done}/{overallStats.expected}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
