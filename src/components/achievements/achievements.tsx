// @ts-nocheck
import { useMemo } from "react";
import { motion } from "framer-motion";
import { Trophy, Flame, Star, Zap, CheckCircle2, Award, Target, Crown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Achievement definitions
export const ACHIEVEMENTS = [
  { id: "first_checkin",    icon: Star,         label: "First Step",        desc: "Complete your first check-in",          color: "text-amber-500",   bg: "bg-amber-500/10",    check: ({ streaks }) => streaks.some(s => s.current_streak >= 1) },
  { id: "streak_3",         icon: Flame,        label: "On a Roll",         desc: "Reach a 3-day streak",                   color: "text-orange-400",  bg: "bg-orange-400/10",   check: ({ streaks }) => streaks.some(s => (s.current_streak || s.longest_streak) >= 3) },
  { id: "streak_7",         icon: Flame,        label: "Week Warrior",      desc: "Reach a 7-day streak",                   color: "text-orange-500",  bg: "bg-orange-500/10",   check: ({ streaks }) => streaks.some(s => (s.current_streak || s.longest_streak) >= 7) },
  { id: "streak_14",        icon: Zap,          label: "Unstoppable",       desc: "Reach a 14-day streak",                  color: "text-purple-500",  bg: "bg-purple-500/10",   check: ({ streaks }) => streaks.some(s => (s.current_streak || s.longest_streak) >= 14) },
  { id: "streak_30",        icon: Crown,        label: "Legendary",         desc: "Reach a 30-day streak",                  color: "text-yellow-400",  bg: "bg-yellow-400/10",   check: ({ streaks }) => streaks.some(s => (s.current_streak || s.longest_streak) >= 30) },
  { id: "chore_complete",   icon: CheckCircle2, label: "Chore Champion",    desc: "Complete all chores in a day",           color: "text-chart-2",     bg: "bg-chart-2/10",      check: ({ todayProgress }) => todayProgress >= 100 },
  { id: "perfect_week",     icon: Trophy,       label: "Perfect Week",      desc: "100% completion for the whole week",     color: "text-amber-400",   bg: "bg-amber-400/10",    check: ({ weekProgress }) => weekProgress >= 100 },
  { id: "team_effort",      icon: Award,        label: "Team Effort",       desc: "All members check in on the same day",   color: "text-primary",     bg: "bg-primary/10",      check: ({ allCheckedInToday }) => allCheckedInToday },
  { id: "earner",           icon: Target,       label: "Earner",            desc: "Earn over $5 in total streak rewards",   color: "text-emerald-500", bg: "bg-emerald-500/10",  check: ({ totalRewards }) => totalRewards >= 5 },
];

export function useAchievements({ streaks, todayProgress, weekProgress, allCheckedInToday, totalRewards }) {
  return useMemo(() => {
    const ctx = { streaks, todayProgress, weekProgress, allCheckedInToday, totalRewards };
    return ACHIEVEMENTS.map(a => ({ ...a, unlocked: a.check(ctx) }));
  }, [streaks, todayProgress, weekProgress, allCheckedInToday, totalRewards]);
}

export default function AchievementsPanel({ achievements }) {
  const unlocked = achievements.filter(a => a.unlocked);
  const locked = achievements.filter(a => !a.unlocked);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          Achievements
          {unlocked.length > 0 && (
            <span className="ml-auto text-xs font-semibold bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full">
              {unlocked.length}/{achievements.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {achievements.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No achievements yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {[...unlocked, ...locked].map((a, i) => {
              const Icon = a.icon;
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04, type: "spring", stiffness: 260 }}
                  title={`${a.label}: ${a.desc}`}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-center transition-all",
                    a.unlocked
                      ? "border-border bg-card shadow-sm"
                      : "border-dashed border-border/40 opacity-40 grayscale"
                  )}
                >
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", a.unlocked ? a.bg : "bg-muted")}>
                    <Icon className={cn("w-4 h-4", a.unlocked ? a.color : "text-muted-foreground")} />
                  </div>
                  <span className="text-[10px] font-semibold text-foreground leading-tight">{a.label}</span>
                  {a.unlocked && (
                    <motion.div
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      className="w-2 h-2 rounded-full bg-chart-2"
                    />
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}