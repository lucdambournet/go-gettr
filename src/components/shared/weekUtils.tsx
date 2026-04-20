import { startOfWeek, endOfWeek, addDays, format, subWeeks, addWeeks } from "date-fns";

export interface ChoreSchedule {
  activeDays: Date[];
  isLegacyWeekly: boolean;
}

export interface WeekStats {
  expected: number;
  done: number;
}

export interface ChoreForSchedule {
  id: string;
  frequency?: string;
}

export type LogMap = Record<string, unknown>;

export function getWeekStart(date: Date = new Date()): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function getWeekEnd(date: Date = new Date()): Date {
  return endOfWeek(date, { weekStartsOn: 1 });
}

export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function formatDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function formatWeekLabel(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  return `${format(weekStart, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
}

export function getPrevWeek(weekStart: Date): Date {
  return subWeeks(weekStart, 1);
}

export function getNextWeek(weekStart: Date): Date {
  return addWeeks(weekStart, 1);
}

export function getDayName(date: Date): string {
  return format(date, "EEE");
}

const DAY_KEY_MAP = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export function getDayKey(date: Date): string {
  return DAY_KEY_MAP[date.getDay()];
}

export function parseFrequencyDays(frequency: string | null | undefined): string[] {
  if (!frequency || frequency === "daily" || frequency === "twice_daily") return ["mon","tue","wed","thu","fri","sat","sun"];
  if (frequency === "weekly") return ["mon","tue","wed","thu","fri","sat","sun"];
  if (frequency.startsWith("2x:")) return frequency.slice(3).split(",").map(d => d.trim()).filter(Boolean);
  return frequency.split(",").map((d) => d.trim()).filter(Boolean);
}

export function getChoreSchedule(chore: ChoreForSchedule, weekDays: Date[]): ChoreSchedule {
  const freq = chore.frequency || "weekly";
  const isLegacyWeekly = freq === "weekly";
  const activeDayKeys = parseFrequencyDays(freq);
  const activeDays = weekDays.filter((d) => activeDayKeys.includes(DAY_KEY_MAP[d.getDay()]));
  return { activeDays, isLegacyWeekly };
}

export function choreWeekStats(chore: ChoreForSchedule, weekDays: Date[], logMap: LogMap): WeekStats {
  const { activeDays, isLegacyWeekly } = getChoreSchedule(chore, weekDays);
  if (isLegacyWeekly) {
    const done = weekDays.some((d) => logMap[`${chore.id}_${formatDate(d)}`]) ? 1 : 0;
    return { expected: 1, done };
  }
  const done = activeDays.filter((d) => logMap[`${chore.id}_${formatDate(d)}`]).length;
  return { expected: activeDays.length, done };
}