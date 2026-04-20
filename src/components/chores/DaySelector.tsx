import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Sun, Repeat2, RotateCcw } from "lucide-react";

const DAYS = [
  { key: "mon", label: "M",  full: "Monday" },
  { key: "tue", label: "T",  full: "Tuesday" },
  { key: "wed", label: "W",  full: "Wednesday" },
  { key: "thu", label: "Th", full: "Thursday" },
  { key: "fri", label: "F",  full: "Friday" },
  { key: "sat", label: "Sa", full: "Saturday" },
  { key: "sun", label: "Su", full: "Sunday" },
];

// Frequency format:
//   "daily"         → every day once
//   "twice_daily"   → every day twice
//   "weekly"        → legacy — any day (once)
//   "mon,wed,fri"   → specific days once
//   "2x:mon,wed"    → specific days twice

export function parseDays(frequency: string | undefined | null): { days: string[]; twice: boolean } {
  if (!frequency || frequency === "daily") return { days: DAYS.map(d => d.key), twice: false };
  if (frequency === "twice_daily") return { days: DAYS.map(d => d.key), twice: true };
  if (frequency === "weekly") return { days: [], twice: false };
  if (frequency.startsWith("2x:")) {
    const dayStr = frequency.slice(3);
    return { days: dayStr ? dayStr.split(",").map(d => d.trim()).filter(Boolean) : [], twice: true };
  }
  return { days: frequency.split(",").map(d => d.trim()).filter(Boolean), twice: false };
}

export function serializeDays(days: string[], twice: boolean): string {
  if (days.length === 7 && twice) return "twice_daily";
  if (days.length === 7 && !twice) return "daily";
  if (days.length === 0) return "weekly";
  if (twice) return `2x:${days.join(",")}`;
  return days.join(",");
}

interface DaySelectorProps {
  value: string | undefined;
  onChange: (value: string) => void;
}

export default function DaySelector({ value, onChange }: DaySelectorProps) {
  const { days: selected, twice } = parseDays(value);

  const toggleDay = (key: string) => {
    const next = selected.includes(key) ? selected.filter(d => d !== key) : [...selected, key];
    onChange(serializeDays(next, twice));
  };

  const toggleTwice = () => {
    onChange(serializeDays(selected, !twice));
  };

  const setPreset = (preset: string) => {
    if (preset === "daily") onChange(twice ? "twice_daily" : "daily");
    if (preset === "weekdays") onChange(serializeDays(["mon","tue","wed","thu","fri"], twice));
    if (preset === "weekend") onChange(serializeDays(["sat","sun"], twice));
    if (preset === "none") onChange("weekly");
  };

  const allSelected = selected.length === 7;

  const summaryText = () => {
    if (selected.length === 0) return "No days selected";
    const freq = twice ? "twice" : "once";
    if (selected.length === 7) return `Every day, ${freq} a day`;
    if (selected.length <= 3) return selected.map(k => DAYS.find(d => d.key === k)?.full).join(", ") + ` · ${freq}/day`;
    return `${selected.length} days/week · ${freq}/day`;
  };

  return (
    <div className="space-y-3">
      {/* Preset chips */}
      <div className="flex gap-1.5 flex-wrap">
        {[
          { id: "daily", label: "Every day" },
          { id: "weekdays", label: "Weekdays" },
          { id: "weekend", label: "Weekend" },
          { id: "none", label: "None" },
        ].map(p => (
          <motion.button key={p.id} type="button" whileTap={{ scale: 0.9 }}
            onClick={() => setPreset(p.id)}
            className="text-[11px] px-2.5 py-1 rounded-lg font-semibold border transition-all bg-secondary text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
          >
            {p.label}
          </motion.button>
        ))}
      </div>

      {/* Day buttons */}
      <div className="flex gap-1">
        {DAYS.map((day, i) => {
          const active = selected.includes(day.key);
          return (
            <motion.button
              key={day.key}
              type="button"
              onClick={() => toggleDay(day.key)}
              title={day.full}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, type: "spring", stiffness: 400, damping: 22 }}
              whileHover={{ y: -3, scale: 1.08 }}
              whileTap={{ scale: 0.85 }}
              className={cn(
                "flex-1 h-11 rounded-xl text-[11px] font-bold transition-colors relative overflow-hidden",
                active
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/70"
              )}
            >
              <AnimatePresence>
                {active && (
                  <motion.div
                    key="fill"
                    layoutId={`daysel-${day.key}`}
                    className="absolute inset-0 bg-primary rounded-xl"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 24 }}
                  />
                )}
              </AnimatePresence>
              <span className="relative z-10">{day.label}</span>
              {/* Twice indicator dot */}
              {active && twice && (
                <motion.span
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="absolute top-0.5 right-0.5 w-2 h-2 bg-accent rounded-full z-20 shadow"
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Twice daily toggle */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.97 }}
        onClick={toggleTwice}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left",
          twice
            ? "border-accent bg-accent/10 text-foreground"
            : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/30"
        )}
      >
        <div className={cn(
          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
          twice ? "bg-accent text-accent-foreground" : "bg-secondary"
        )}>
          <Repeat2 className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-foreground">Twice daily</div>
          <div className="text-[11px] text-muted-foreground">Must be completed 2× on selected days</div>
        </div>
        <AnimatePresence mode="wait">
          {twice ? (
            <motion.div key="on" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              className="w-5 h-5 rounded-full bg-accent flex items-center justify-center">
              <span className="text-accent-foreground text-[10px] font-black">✓</span>
            </motion.div>
          ) : (
            <motion.div key="off" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              className="w-5 h-5 rounded-full border-2 border-border" />
          )}
        </AnimatePresence>
      </motion.button>

      {/* Summary */}
      <motion.p
        key={summaryText()}
        initial={{ opacity: 0, x: -4 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-xs text-muted-foreground font-medium"
      >
        {summaryText()}
      </motion.p>
    </div>
  );
}