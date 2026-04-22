import { useMemo, useEffect, useState, type ElementType } from "react";
import { entities } from "@/api/entities";
import { type Profile, type Chore, type ChoreLog, type Streak } from "@/types/entities";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Users, ListChecks, DollarSign, TrendingUp, ArrowRight, Flame, Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import PersonAvatar from "@/components/shared/PersonAvatar";
import { getWeekStart, getWeekDays, formatDate, formatWeekLabel, choreWeekStats } from "@/components/shared/weekUtils";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useNotifications, isStreakAtRisk, hasStreakBroken } from "@/hooks/useNotifications";
import AchievementsPanel, { useAchievements } from "@/components/achievements/AchievementSystem";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ErrorAlert } from "@/components/shared/ErrorAlert";

// Day keys map
const DAY_KEY_MAP = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
function getTodayChores(chores: Chore[], today: Date): Chore[] {
  const todayKey = DAY_KEY_MAP[today.getDay()];
  return chores.filter((c) => {
    if (!c.active) return false;
    const freq = c.frequency || "weekly";
    if (freq === "daily" || freq === "weekly") return true;
    return freq.split(",").map(d => d.trim()).includes(todayKey);
  });
}

function RankBadge({ rank }: { rank: number }) {
  const palette = [
    { bg: "#FFD700", ring: "#A07800" },
    { bg: "#C0C0C0", ring: "#707070" },
    { bg: "#CD7F32", ring: "#7A3F10" },
  ];
  const c = palette[rank - 1];
  if (!c) return <span className="text-xs font-black text-muted-foreground w-4 text-center shrink-0">{rank}.</span>;
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
      <circle cx="9" cy="9" r="8.5" fill={c.bg} stroke={c.ring} strokeWidth="1.2" />
      <text x="9" y="13.2" textAnchor="middle" fontSize="8.5" fontWeight="bold" fill={c.ring}>{rank}</text>
    </svg>
  );
}

function StatCard({ icon: Icon, label, value, sublabel, accent }: {
  icon: ElementType;
  label: string;
  value: string | number;
  sublabel?: string;
  accent?: boolean;
}) {
  return (
    <motion.div whileHover={{ y: -5, transition: { duration: 0.2 } }}>
      <Card className={cn(
        "relative overflow-hidden hover:shadow-xl transition-shadow cursor-default",
        accent && "border-primary/20"
      )}>
        {accent && (
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-8 translate-x-8 pointer-events-none" />
        )}
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
              <motion.p
                initial={{ opacity: 0, scale: 0.75 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25, type: "spring", stiffness: 200 }}
                className="text-3xl font-black text-foreground mt-1.5 tracking-tight"
              >
                {value}
              </motion.p>
              {sublabel && <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>}
            </div>
            <motion.div
              whileHover={{ rotate: 20, scale: 1.2 }}
              transition={{ type: "spring", stiffness: 300 }}
              className={cn(
                "w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm",
                accent ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function Dashboard() {
  const today = new Date();
  const todayStr = formatDate(today);
  const weekStart = getWeekStart();
  const weekDays = getWeekDays(weekStart);
  const weekStartStr = formatDate(weekStart);

  const { requestPermission, sendNotification, permission } = useNotifications();
  const [notifEnabled, setNotifEnabled] = useState(permission === "granted");

  const peopleQuery = useQuery({ queryKey: ["people"], queryFn: () => entities.Profile.list() as unknown as Promise<Profile[]> });
  const choresQuery = useQuery({ queryKey: ["chores"], queryFn: () => entities.Chore.list() as Promise<Chore[]> });
  const logsQuery = useQuery({
    queryKey: ["choreLogs", weekStartStr],
    queryFn: () => entities.ChoreLog.filter({ week_start: weekStartStr }) as Promise<ChoreLog[]>,
  });
  const streaksQuery = useQuery({ queryKey: ["streaks"], queryFn: () => entities.Streak.list() as Promise<Streak[]> });

  const isLoading = peopleQuery.isLoading || choresQuery.isLoading || logsQuery.isLoading || streaksQuery.isLoading;
  const isError = peopleQuery.isError || choresQuery.isError || logsQuery.isError || streaksQuery.isError;
  const error = (peopleQuery.error ?? choresQuery.error ?? logsQuery.error ?? streaksQuery.error) as Error | null;

  const people = peopleQuery.data ?? [];
  const chores = choresQuery.data ?? [];
  const logs = logsQuery.data ?? [];
  const streaks = streaksQuery.data ?? [];

  const activePeople = people.filter((p) => p.active !== false);
  const activeChores = chores.filter((c) => c.active !== false);

  const completedLogMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    logs.forEach((log) => { if (log.completed) map[`${log.chore_id}_${log.day}`] = true; });
    return map;
  }, [logs]);

  const streakMap = useMemo(() => Object.fromEntries(streaks.map((s) => [s.profile_id, s])), [streaks]);

  // Today's progress per person (used for progress bars)
  const stats = useMemo(() => {
    // Weekly totals for the stat card
    let totalExpected = 0, totalDone = 0;
    activeChores.forEach((chore) => {
      const s = choreWeekStats(chore, weekDays, completedLogMap);
      totalExpected += s.expected;
      totalDone += s.done;
    });

    const personStats = activePeople.map((person, i) => {
      const personChores = activeChores.filter((c) => c.assigned_to === person.id);

      // Today's chores for this person
      const todayChores = getTodayChores(personChores, today);
      const todayDone = todayChores.filter(c => completedLogMap[`${c.id}_${todayStr}`]).length;
      const todayExpected = todayChores.length;
      const todayProgress = todayExpected > 0 ? Math.round((todayDone / todayExpected) * 100) : 0;

      const allComplete = todayExpected > 0 && todayDone >= todayExpected;
      const streak = streakMap[person.id];

      return {
        person, index: i, choreCount: personChores.length,
        done: todayDone, expected: todayExpected,
        progress: todayProgress,
        earned: allComplete ? (person.weekly_allowance || 0) : 0,
        streak: streak?.current_streak || 0,
        streakAtRisk: isStreakAtRisk(streak),
        streakBroken: hasStreakBroken(streak),
      };
    });

    const totalEarned = personStats.reduce((sum, ps) => sum + ps.earned, 0);
    const totalPossible = activePeople.reduce((sum, p) => sum + (p.weekly_allowance || 0), 0);
    return { totalExpected, totalDone, personStats, totalEarned, totalPossible };
  }, [activePeople, activeChores, completedLogMap, weekDays, streakMap, todayStr]);

  const weekProgress = stats.totalExpected > 0 ? Math.round((stats.totalDone / stats.totalExpected) * 100) : 0;
  const todayTotalExpected = stats.personStats.reduce((s, ps) => s + ps.expected, 0);
  const todayTotalDone = stats.personStats.reduce((s, ps) => s + ps.done, 0);
  const todayProgress = todayTotalExpected > 0 ? Math.round((todayTotalDone / todayTotalExpected) * 100) : 0;

  const totalRewards = streaks.reduce((s, st) => s + (st.total_rewards_earned || 0), 0);
  const allCheckedInToday = activePeople.length > 0 && activePeople.every(p => streakMap[p.id]?.last_checkin_date === todayStr);

  const achievements = useAchievements({
    streaks,
    todayProgress,
    weekProgress,
    allCheckedInToday,
    totalRewards,
  });

  // Send notifications when data loads
  useEffect(() => {
    if (!notifEnabled || !people.length || !streaks.length) return;

    // Streak at-risk notifications
    activePeople.forEach(person => {
      const streak = streakMap[person.id];
      if (streak && isStreakAtRisk(streak)) {
        sendNotification(
          `⚠️ ${person.name}'s streak is at risk!`,
          { body: `Check in today to keep the ${streak.current_streak}-day streak alive.` }
        );
      }
    });

    // Chore due soon (any pending today)
    const pendingToday = stats.personStats.filter(ps => ps.expected > ps.done);
    if (pendingToday.length > 0) {
      const names = pendingToday.map(ps => ps.person.name).join(", ");
      sendNotification(
        "📋 Chores pending today",
        { body: `${names} still ${pendingToday.length === 1 ? "has" : "have"} chores to complete.` }
      );
    }
     
  }, [notifEnabled, streaks.length, people.length]);

  const handleToggleNotifications = async () => {
    if (notifEnabled) {
      setNotifEnabled(false);
    } else {
      const perm = await requestPermission();
      if (perm === "granted") setNotifEnabled(true);
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorAlert error={error} />;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative -mx-4 md:-mx-8 -mt-4 md:-mt-8 px-4 md:px-8 pt-8 md:pt-10 pb-6 mb-2 overflow-visible"
        style={{ background: "linear-gradient(135deg, #6366f128 0%, #6366f110 50%, transparent 100%)" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 80% 0%, #6366f11e 0%, transparent 65%)" }} />
        <div className="flex items-end justify-between relative">
          <div>
            <h1 className="text-3xl font-black text-foreground tracking-tight font-nunito">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1 font-medium">{formatWeekLabel(weekStart)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleToggleNotifications}
              title={notifEnabled ? "Disable notifications" : "Enable notifications"}
              className={cn("h-9 w-9", notifEnabled && "border-primary text-primary")}
            >
              {notifEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </Button>
            <Link
              to="/Daily"
              className="flex items-center gap-1.5 text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/15 px-3 py-1.5 rounded-xl transition-colors"
            >
              Today's chores <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Streak at-risk banners */}
      {stats.personStats.filter(ps => ps.streakAtRisk).map(ps => (
        <motion.div
          key={ps.person.id}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-orange-500/10 border border-orange-500/30 text-sm"
        >
          <Flame className="w-4 h-4 text-orange-500 shrink-0" />
          <span className="font-semibold text-orange-700 dark:text-orange-400">
            {ps.person.name}'s {ps.streak}-day streak is at risk — check in today!
          </span>
          <Link to="/CheckIn" className="ml-auto text-xs font-bold text-orange-600 underline underline-offset-2 shrink-0">
            Check in →
          </Link>
        </motion.div>
      ))}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="People" value={activePeople.length} />
        <StatCard icon={ListChecks} label="Active Chores" value={activeChores.length} />
        <StatCard icon={TrendingUp} label="Today" value={`${todayProgress}%`} sublabel={`${todayTotalDone}/${todayTotalExpected} tasks`} accent />
        <StatCard icon={DollarSign} label="Allowance Earned" value={`$${stats.totalEarned.toFixed(2)}`} sublabel={`of $${stats.totalPossible.toFixed(2)} possible`} />
      </div>

      {/* Main content: progress + leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Today's Progress */}
        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold">Today's Progress</CardTitle>
                <Link to="/WeeklyView" className="text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/15 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors">
                  Weekly view <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {stats.personStats.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Add people and chores to see progress here.</p>
              ) : (
                <div className="space-y-5">
                  {stats.personStats.map((ps, i) => (
                    <motion.div
                      key={ps.person.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.35 + i * 0.07, duration: 0.35 }}
                      className="flex items-center gap-3"
                    >
                      <PersonAvatar name={ps.person.name} avatarColor={ps.person.avatar_color} colorIndex={ps.index} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">{ps.person.name}</span>
                            {ps.streakAtRisk && (
                              <span className="text-[10px] bg-orange-500/10 text-orange-500 font-bold px-1.5 py-0.5 rounded-full">
                                streak at risk
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground tabular-nums">{ps.done}/{ps.expected}</span>
                        </div>
                        <Progress value={ps.progress} className="h-2.5" />
                      </div>
                      <div className="text-right shrink-0 w-14">
                        <p className="text-sm font-black text-foreground">{ps.progress}%</p>
                        {ps.earned > 0 && (
                          <p className="text-xs text-emerald-500 font-semibold">${ps.earned.toFixed(2)}</p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: Streaks + Achievements */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Streak leaderboard */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500" /> Streaks
                </CardTitle>
                <Link to="/CheckIn" className="text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/15 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors">
                  Check in <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {stats.personStats.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No people yet.</p>
              ) : (
                <div className="space-y-3">
                  {[...stats.personStats]
                    .sort((a, b) => b.streak - a.streak)
                    .map((ps, rank) => (
                      <motion.div
                        key={ps.person.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.45 + rank * 0.07 }}
                        className="flex items-center gap-3 py-1.5"
                      >
                        <RankBadge rank={rank + 1} />
                        <PersonAvatar name={ps.person.name} avatarColor={ps.person.avatar_color} colorIndex={ps.index} size="sm" />
                        <span className="text-sm font-medium text-foreground flex-1 truncate">{ps.person.name}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <Flame className={cn("w-3.5 h-3.5",
                            ps.streak >= 14 ? "text-purple-500" :
                              ps.streak >= 7 ? "text-orange-500" :
                                ps.streak >= 3 ? "text-amber-500" : "text-muted-foreground"
                          )} />
                          <span className="text-sm font-black tabular-nums text-foreground">{ps.streak}</span>
                          {ps.streakAtRisk && <span className="text-orange-500 text-xs">⚠️</span>}
                        </div>
                      </motion.div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Achievements */}
          <AchievementsPanel achievements={achievements} />
        </div>
      </div>
    </div>
  );
}