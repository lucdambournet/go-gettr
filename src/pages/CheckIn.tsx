import { useState, useMemo } from "react";
import { entities } from "@/api/entities";
import { Profile, Streak } from "@/types/entities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame, Trophy, Zap, Star, CheckCircle2, Calendar } from "lucide-react";
import PersonAvatar from "@/components/shared/PersonAvatar";
import { formatDate } from "@/components/shared/weekUtils";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { format, differenceInCalendarDays, parseISO } from "date-fns";
import { soundCheckIn } from "@/lib/useSound";

// Returns the true calendar-day difference between two date strings
function daysDiff(dateStrA: string | null | undefined, dateStrB: string | null | undefined): number {
  if (!dateStrA || !dateStrB) return Infinity;
  return Math.abs(differenceInCalendarDays(parseISO(dateStrA), parseISO(dateStrB)));
}

const BASE_REWARD = 0.25;
function calcReward(streak: number): number {
  return BASE_REWARD * Math.pow(1.5, streak - 1);
}

function StreakIcon({ streak, className }: { streak: number; className?: string }) {
  if (streak >= 30) return <Trophy className={cn("text-amber-400", className)} />;
  if (streak >= 14) return <Zap className={cn("text-purple-500", className)} />;
  if (streak >= 7) return <Flame className={cn("text-orange-500", className)} />;
  if (streak >= 3) return <Star className={cn("text-amber-500", className)} />;
  return <Star className={cn("text-muted-foreground", className)} />;
}

function StreakCalendar({ streak }: { streak: Streak | undefined | null }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return formatDate(d);
  });
  const today = formatDate(new Date());
  const lastCheckin = streak?.last_checkin_date;
  const currentStreak = streak?.current_streak || 0;

  const activeSet = new Set();
  if (lastCheckin && currentStreak > 0) {
    for (let i = 0; i < currentStreak && i < 7; i++) {
      const d = new Date(lastCheckin);
      d.setDate(d.getDate() - i);
      activeSet.add(formatDate(d));
    }
  }
  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <div className="flex gap-1.5 justify-between">
      {days.map((dayStr, i) => {
        const isActive = activeSet.has(dayStr);
        const isToday = dayStr === today;
        return (
          <div key={dayStr} className="flex flex-col items-center gap-1">
            <motion.div
              initial={{ scale: 0, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05, type: "spring", stiffness: 350, damping: 18 }}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm",
                isActive
                  ? "bg-primary text-primary-foreground shadow-primary/30"
                  : isToday
                    ? "bg-secondary border-2 border-primary/40 text-foreground"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {isActive ? "✓" : "·"}
            </motion.div>
            <span className={cn("text-[9px] font-semibold", isToday ? "text-primary" : "text-muted-foreground")}>
              {dayLabels[new Date(dayStr).getDay() === 0 ? 6 : new Date(dayStr).getDay() - 1]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const PERSON_ACCENT_COLORS = ["#6366f1", "#f59e0b", "#ec4899", "#06b6d4", "#8b5cf6", "#10b981"];

function StreakCard({ person, personIndex, streak, onCheckIn, isCheckingIn }: {
  person: Profile;
  personIndex: number;
  streak: Streak | undefined;
  onCheckIn: (person: Profile, streak: Streak | undefined) => void;
  isCheckingIn: boolean;
}) {
  const today = formatDate(new Date());
  const alreadyCheckedIn = streak?.last_checkin_date === today;
  const currentStreak = streak?.current_streak || 0;
  const longestStreak = streak?.longest_streak || 0;
  const totalRewards = streak?.total_rewards_earned || 0;
  const nextReward = calcReward(currentStreak + 1);
  const accent = PERSON_ACCENT_COLORS[personIndex % PERSON_ACCENT_COLORS.length];

  const flameColor =
    currentStreak >= 14 ? "text-purple-500" :
      currentStreak >= 7 ? "text-orange-500" :
        currentStreak >= 3 ? "text-amber-500" : "text-muted-foreground";

  const flameBg =
    currentStreak >= 14 ? "bg-purple-500/10" :
      currentStreak >= 7 ? "bg-orange-500/10" :
        currentStreak >= 3 ? "bg-amber-500/10" : "bg-muted";

  return (
    <motion.div
      initial={{ opacity: 0, y: 32, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: personIndex * 0.1, type: "spring", stiffness: 200, damping: 22 }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
    >
      <Card
        className="overflow-hidden transition-all duration-300 relative"
        style={{
          borderColor: alreadyCheckedIn ? "#10b98166" : `${accent}44`,
          boxShadow: alreadyCheckedIn
            ? `0 8px 32px #10b98118, 0 0 0 2px #10b98133`
            : `0 4px 16px ${accent}12, 0 0 0 1px ${accent}22`,
        }}
      >
        {/* Top accent strip — gradient per person */}
        <div className="h-1.5 w-full" style={{
          background: alreadyCheckedIn
            ? "linear-gradient(90deg, #10b981, #34d39988)"
            : `linear-gradient(90deg, ${accent}, ${accent}55)`
        }} />

        <CardContent className="p-5 space-y-4">
          {/* Person row */}
          <div className="flex items-center gap-3">
            <PersonAvatar name={person.name} avatarColor={person.avatar_color} colorIndex={personIndex} size="lg" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-foreground">{person.name}</span>
                {alreadyCheckedIn && (
                  <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 400 }}>
                    <Badge className="bg-chart-2 text-white border-0 text-[10px]">✓ Done today</Badge>
                  </motion.div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full", flameBg)}>
                  <Flame className={cn("w-3.5 h-3.5", flameColor)} />
                  <span className={cn("text-xs font-black tabular-nums", flameColor)}>{currentStreak}</span>
                </div>
                <span className="text-xs text-muted-foreground">day streak</span>
                <span className="text-muted-foreground/40">·</span>
                <Trophy className="w-3 h-3 text-amber-500" />
                <span className="text-xs text-muted-foreground">Best: {longestStreak}</span>
              </div>
            </div>
            <div className="text-right shrink-0 flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                <StreakIcon streak={currentStreak > 0 ? currentStreak : 0} className="w-5 h-5" />
              </div>
              <div className="text-[10px] text-muted-foreground">${totalRewards.toFixed(2)}</div>
            </div>
          </div>

          {/* Mini calendar */}
          <StreakCalendar streak={streak} />

          {/* Reward row */}
          <div className="flex items-center justify-between rounded-xl bg-secondary/50 px-3 py-2">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs text-muted-foreground">
                {alreadyCheckedIn ? "Today earned" : "Next reward"}
              </span>
            </div>
            <motion.span
              key={nextReward}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-sm font-black text-primary"
            >
              ${nextReward.toFixed(2)}
            </motion.span>
          </div>

          {/* CTA */}
          <AnimatePresence mode="wait">
            {alreadyCheckedIn ? (
              <motion.div key="done"
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-chart-2/10 text-sm text-chart-2 font-semibold"
              >
                <CheckCircle2 className="w-4 h-4" /> Come back tomorrow!
              </motion.div>
            ) : (
              <motion.div key="btn"
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              >
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}>
                  <Button className="w-full gap-2 h-11 rounded-xl font-bold text-base shadow-lg shadow-primary/20"
                    onClick={() => onCheckIn(person, streak)} disabled={isCheckingIn}>
                    <Flame className="w-4 h-4" />
                    {isCheckingIn ? "Checking in…" : `Check In · +$${nextReward.toFixed(2)}`}
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function RewardFlash({ reward, name, onDone }: { reward: number; name: string; onDone: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onDone} />
      <motion.div
        initial={{ scale: 0.3, y: 60, rotate: -8 }}
        animate={{ scale: 1, y: 0, rotate: 0 }}
        exit={{ scale: 1.1, opacity: 0, y: -50 }}
        transition={{ type: "spring", stiffness: 280, damping: 20 }}
        className="relative z-10 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-3xl px-12 py-10 text-center shadow-2xl cursor-pointer"
        onClick={onDone}
      >
        {/* Custom flame icon instead of emoji */}
        <motion.div
          animate={{ scale: [1, 1.25, 1], rotate: [0, 8, -8, 0] }}
          transition={{ duration: 0.55, delay: 0.18 }}
          className="flex justify-center mb-3"
        >
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
            <Flame className="w-9 h-9 text-orange-300" />
          </div>
        </motion.div>
        <div className="text-lg font-bold opacity-90">{name}'s streak!</div>
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 300 }}
          className="text-5xl font-black mt-2 mb-1"
        >
          +${reward.toFixed(2)}
        </motion.div>
        <div className="text-sm opacity-70 font-medium">Keep the streak going!</div>
      </motion.div>
    </motion.div>
  );
}

export default function CheckIn() {
  const queryClient = useQueryClient();
  const [flash, setFlash] = useState<{ reward: number; name: string } | null>(null);

  const { data: people = [] } = useQuery({ queryKey: ["people"], queryFn: () => entities.Profile.list() as unknown as Promise<Profile[]> });
  const { data: streaks = [] } = useQuery({ queryKey: ["streaks"], queryFn: () => entities.Streak.list() as Promise<Streak[]> });

  const createStreakMutation = useMutation({
    mutationFn: (data: Partial<Streak>) => entities.Streak.create(data) as Promise<Streak>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["streaks"] });
      queryClient.invalidateQueries({ queryKey: ["payouts"] });
    },
  });
  const updateStreakMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Streak> }) => entities.Streak.update(id, data) as Promise<Streak>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["streaks"] });
      queryClient.invalidateQueries({ queryKey: ["payouts"] });
    },
  });

  const activePeople = people.filter((p) => p.active !== false && !p.is_parent);
  const streakMap = useMemo(() => Object.fromEntries(streaks.map((s) => [s.profile_id, s])), [streaks]);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);

  const handleCheckIn = async (person: Profile, streak: Streak | undefined) => {
    soundCheckIn();
    setCheckingInId(person.id);
    const today = formatDate(new Date());
    let newStreak;
    if (!streak) {
      newStreak = 1;
      const reward = calcReward(newStreak);
      setFlash({ reward, name: person.name });
      await createStreakMutation.mutateAsync({ profile_id: person.id, current_streak: newStreak, longest_streak: newStreak, last_checkin_date: today, total_rewards_earned: reward });
    } else {
      // Only continue streak if last check-in was exactly yesterday (calendar days)
      const diff = daysDiff(today, streak.last_checkin_date);
      newStreak = diff === 1 ? (streak.current_streak || 0) + 1 : 1;
      const reward = calcReward(newStreak);
      setFlash({ reward, name: person.name });
      await updateStreakMutation.mutateAsync({ id: streak.id, data: { current_streak: newStreak, longest_streak: Math.max(newStreak, streak.longest_streak || 0), last_checkin_date: today, total_rewards_earned: (streak.total_rewards_earned || 0) + reward } });
    }
    setCheckingInId(null);
  };

  const dismissFlash = () => setFlash(null);

  const totalRewards = streaks.reduce((s, st) => s + (st.total_rewards_earned || 0), 0);
  const maxStreak = streaks.reduce((m, st) => Math.max(m, st.current_streak || 0), 0);
  const checkedInToday = streaks.filter((st) => st.last_checkin_date === formatDate(new Date())).length;

  return (
    <div className="space-y-8">
      <AnimatePresence>
        {flash && <RewardFlash reward={flash.reward} name={flash.name} onDone={dismissFlash} />}
      </AnimatePresence>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 200 }}>
        <div className="relative -mx-4 md:-mx-8 -mt-4 md:-mt-8 px-4 md:px-8 pt-8 md:pt-10 pb-6 overflow-visible"
          style={{ background: "linear-gradient(135deg, #f9731628 0%, #f9731610 60%, transparent 100%)" }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 90% 50%, #f973161e 0%, transparent 70%)" }} />
          <div className="flex items-start justify-between relative">
            <div>
              <h1 className="text-3xl font-black text-foreground tracking-tight font-nunito">Daily Check-In</h1>
              <p className="text-sm text-muted-foreground mt-1">Build your streak, earn exponential rewards</p>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background/70 backdrop-blur-sm border text-sm font-semibold text-foreground shadow-sm"
            >
              <Calendar className="w-4 h-4 text-primary" />
              {format(new Date(), "EEEE, MMM d")}
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Top stats */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        className="grid grid-cols-3 gap-3"
      >
        {[
          { icon: CheckCircle2, label: "Today", value: `${checkedInToday}/${activePeople.length}`, color: "text-chart-2", bg: "bg-chart-2/10" },
          { icon: Flame, label: "Top Streak", value: `${maxStreak}d`, color: "text-orange-500", bg: "bg-orange-500/10" },
          { icon: Star, label: "Total Earned", value: `$${totalRewards.toFixed(2)}`, color: "text-primary", bg: "bg-primary/10" },
        ].map((s, i) => (
          <motion.div key={s.label}
            initial={{ opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.12 + i * 0.07, type: "spring", stiffness: 260 }}
            whileHover={{ y: -3 }}
          >
            <Card>
              <CardContent className="p-4 flex flex-col items-center text-center gap-1">
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-1", s.bg)}>
                  <s.icon className={cn("w-4 h-4", s.color)} />
                </div>
                <div className="text-xl font-black text-foreground">{s.value}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{s.label}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Reward scale */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="border-primary/20 bg-primary/3">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 mb-2.5">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-bold text-primary uppercase tracking-wider">Exponential Rewards</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3, 5, 7, 14, 30].map((day, i) => (
                <motion.div
                  key={day}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.25 + i * 0.04 }}
                  className="flex flex-col items-center bg-background rounded-xl px-2.5 py-1.5 border"
                >
                  <span className="text-[9px] text-muted-foreground">Day {day}</span>
                  <span className="text-xs font-black text-foreground">${calcReward(day).toFixed(2)}</span>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Person cards */}
      {activePeople.length === 0 ? (
        <Card>
          <CardContent className="p-16 text-center text-muted-foreground">
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 2.5 }}>
              <Flame className="w-10 h-10 mx-auto mb-3 opacity-30" />
            </motion.div>
            <p className="text-sm">Add people to start tracking streaks.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {activePeople.map((person, i) => (
            <StreakCard key={person.id} person={person} personIndex={i}
              streak={streakMap[person.id]} onCheckIn={handleCheckIn} isCheckingIn={checkingInId === person.id} />
          ))}
        </div>
      )}
    </div>
  );
}