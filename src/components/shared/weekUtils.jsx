import { startOfWeek, endOfWeek, addDays, format, subWeeks, addWeeks } from "date-fns";

export function getWeekStart(date = new Date()) {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function getWeekEnd(date = new Date()) {
  return endOfWeek(date, { weekStartsOn: 1 });
}

export function getWeekDays(weekStart) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function formatDate(date) {
  return format(date, "yyyy-MM-dd");
}

export function formatWeekLabel(weekStart) {
  const end = addDays(weekStart, 6);
  return `${format(weekStart, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
}

export function getPrevWeek(weekStart) {
  return subWeeks(weekStart, 1);
}

export function getNextWeek(weekStart) {
  return addWeeks(weekStart, 1);
}

export function getDayName(date) {
  return format(date, "EEE");
}

// Maps a Date to the day key used by DaySelector ("mon","tue","wed","thu","fri","sat","sun")
const DAY_KEY_MAP = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
export function getDayKey(date) {
  return DAY_KEY_MAP[date.getDay()];
}

// Parse a frequency string into an array of day keys
export function parseFrequencyDays(frequency) {
  if (!frequency || frequency === "daily" || frequency === "twice_daily") return ["mon","tue","wed","thu","fri","sat","sun"];
  if (frequency === "weekly") return ["mon","tue","wed","thu","fri","sat","sun"]; // legacy: any day
  // 2x:mon,wed,fri — twice daily on specific days
  if (frequency.startsWith("2x:")) return frequency.slice(3).split(",").map(d => d.trim()).filter(Boolean);
  return frequency.split(",").map((d) => d.trim()).filter(Boolean);
}

// Returns which weekDays (Date[]) are active for a chore, and whether it's "pick one" vs "do each"
export function getChoreSchedule(chore, weekDays) {
  const freq = chore.frequency || "weekly";
  const isLegacyWeekly = freq === "weekly";
  const activeDayKeys = parseFrequencyDays(freq);
  const activeDays = weekDays.filter((d) => activeDayKeys.includes(DAY_KEY_MAP[d.getDay()]));
  return { activeDays, isLegacyWeekly };
}

// Count expected completions and actual completions for a chore this week
export function choreWeekStats(chore, weekDays, logMap) {
  const { activeDays, isLegacyWeekly } = getChoreSchedule(chore, weekDays);
  if (isLegacyWeekly) {
    // old "weekly": done if checked on any day
    const done = weekDays.some((d) => logMap[`${chore.id}_${formatDate(d)}`]) ? 1 : 0;
    return { expected: 1, done };
  }
  const done = activeDays.filter((d) => logMap[`${chore.id}_${formatDate(d)}`]).length;
  return { expected: activeDays.length, done };
}