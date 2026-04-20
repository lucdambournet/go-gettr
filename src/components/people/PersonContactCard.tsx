import { useState } from "react";
import { type Profile, type Chore, type Streak } from "@/types/entities";
import { type WeekStats } from "@/components/shared/weekUtils";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Trash2, DollarSign, ListChecks, Flame, Calendar, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { getAvatarStyle } from "@/components/people/colorUtils";

// Rank icon SVG components instead of emojis
function RankBadge({ rank }: { rank: number }) {
  const colors: Record<number, { bg: string; ring: string; label: string }> = {
    1: { bg: "#FFD700", ring: "#B8860B", label: "1" },
    2: { bg: "#C0C0C0", ring: "#808080", label: "2" },
    3: { bg: "#CD7F32", ring: "#8B4513", label: "3" },
  };
  const c = colors[rank];
  if (!c) return <span className="text-xs font-black text-muted-foreground">{rank}.</span>;
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="8.5" fill={c.bg} stroke={c.ring} strokeWidth="1"/>
      <text x="9" y="13" textAnchor="middle" fontSize="9" fontWeight="bold" fill={c.ring}>{c.label}</text>
    </svg>
  );
}

interface PersonContactCardProps {
  person: Profile;
  index: number;
  chores: Chore[];
  onEdit?: () => void;
  onDelete?: () => void;
  weeklyStats?: WeekStats | null;
  streakData?: Streak | null;
}

export default function PersonContactCard({ person, index, chores, onEdit, onDelete, weeklyStats, streakData }: PersonContactCardProps) {
  const [expanded, setExpanded] = useState(false);
  const style = getAvatarStyle(person.avatar_color);
  const initial = (person.name || "?")[0].toUpperCase();

  const weeklyAllowance = person.weekly_allowance || 0;
  const bimonthlyEarnings = weeklyAllowance * 2; // bi-monthly ≈ 2 weeks
  const monthlyEarnings = weeklyAllowance * 4;
  const currentStreak = streakData?.current_streak || 0;
  const totalRewards = streakData?.total_rewards_earned || 0;

  // Progress this week (passed in from parent)
  const weekDone = weeklyStats?.done || 0;
  const weekExpected = weeklyStats?.expected || 0;
  const weekProgress = weekExpected > 0 ? Math.round((weekDone / weekExpected) * 100) : 0;
  const allDoneThisWeek = weekExpected > 0 && weekDone >= weekExpected;

  const flameColor =
    currentStreak >= 14 ? "text-purple-500" :
    currentStreak >= 7 ? "text-orange-500" :
    currentStreak >= 3 ? "text-amber-500" : "text-muted-foreground";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 220, damping: 24 }}
      whileHover={{ y: -4, transition: { type: "spring", stiffness: 300, damping: 20 } }}
      className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm hover:shadow-xl transition-shadow"
    >
      {/* Color header strip */}
      <div
        className="relative h-16 flex items-end px-5 pb-0"
        style={{ background: `linear-gradient(135deg, ${style.hex}dd 0%, ${style.hex}66 100%)` }}
      >
        {/* Decorative blobs */}
        <div className="absolute right-4 top-2 w-12 h-12 rounded-full opacity-20 blur-sm" style={{ background: style.hex }} />
        <div className="absolute right-10 top-5 w-6 h-6 rounded-full opacity-20" style={{ background: "white" }} />
      </div>

      {/* Avatar overlapping the strip */}
      <div className="relative px-5 pb-4">
        <div
          className="absolute -top-7 left-5 w-14 h-14 rounded-2xl border-4 border-card flex items-center justify-center text-xl font-black text-white shadow-lg"
          style={{ background: style.hex }}
        >
          {initial}
        </div>

        {/* Name row */}
        <div className="pt-9 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-bold text-foreground text-base leading-tight truncate">{person.name}</h3>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs text-muted-foreground">{chores.length} chore{chores.length !== 1 ? "s" : ""}</span>
              {allDoneThisWeek && (
                <Badge className="bg-emerald-500/15 text-emerald-600 border-0 text-[9px] px-1.5 py-0 h-4 font-bold">
                  ✓ Week done
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 mt-1">
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-black",
              currentStreak > 0 ? "bg-orange-500/10" : "bg-muted"
            )}>
              <Flame className={cn("w-3 h-3", flameColor)} />
              <span className={flameColor}>{currentStreak}</span>
            </div>
          </div>
        </div>

        {/* Weekly progress bar */}
        <div className="mt-3 space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">This week</span>
            <span className="text-[10px] text-muted-foreground tabular-nums">{weekDone}/{weekExpected}</span>
          </div>
          <Progress value={weekProgress} className="h-1.5" />
        </div>

        {/* Earnings row */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { label: "Weekly", value: `$${weeklyAllowance.toFixed(2)}` },
            { label: "Bi-wk", value: `$${bimonthlyEarnings.toFixed(2)}` },
            { label: "Monthly", value: `$${monthlyEarnings.toFixed(2)}` },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col items-center bg-secondary/50 rounded-xl py-1.5 px-1">
              <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wide">{label}</span>
              <span className="text-xs font-black text-foreground mt-0.5">{value}</span>
            </div>
          ))}
        </div>

        {/* Streak rewards earned */}
        {totalRewards > 0 && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <TrendingUp className="w-3 h-3 text-primary" />
            <span>${totalRewards.toFixed(2)} streak rewards earned</span>
          </div>
        )}

        {/* Expand / collapse chores list */}
        {chores.length > 0 && (
          <motion.button
            onClick={() => setExpanded((v) => !v)}
            className="mt-3 w-full flex items-center justify-between text-[11px] text-muted-foreground hover:text-foreground transition-colors py-1 rounded-lg px-1 hover:bg-secondary/40"
          >
            <div className="flex items-center gap-1.5">
              <ListChecks className="w-3 h-3" />
              <span>{expanded ? "Hide chores" : `Show ${chores.length} chore${chores.length !== 1 ? "s" : ""}`}</span>
            </div>
            <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
              <ChevronDown className="w-3.5 h-3.5" />
            </motion.div>
          </motion.button>
        )}

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="mt-2 space-y-1 pb-1">
                {chores.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 text-xs text-muted-foreground py-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
                    <span className="truncate">{c.title}</span>
                    <span className="ml-auto text-[10px] bg-secondary rounded px-1">{c.frequency}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {(onEdit || onDelete) && (
          <div className="flex gap-2 mt-4">
            {onEdit && (
              <Button
                size="sm" variant="outline"
                className="flex-1 gap-1.5 text-xs h-8 rounded-xl"
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
              >
                <Pencil className="w-3 h-3" /> Edit
              </Button>
            )}
            {onDelete && (
              <Button
                size="sm" variant="outline"
                className="flex-1 gap-1.5 text-xs h-8 rounded-xl text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
              >
                <Trash2 className="w-3 h-3" /> Remove
              </Button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}