import { useState } from "react";

interface StreakLike {
  last_checkin_date?: string | null;
  current_streak?: number;
}

export function isStreakAtRisk(streak: StreakLike | null | undefined): boolean {
  if (!streak || !streak.last_checkin_date || (streak.current_streak ?? 0) < 1) return false;
  const last = new Date(streak.last_checkin_date);
  const today = new Date();
  const diffDays = Math.floor((today.getTime() - last.getTime()) / 86400000);
  return diffDays === 1;
}

export function hasStreakBroken(streak: StreakLike | null | undefined): boolean {
  if (!streak || !streak.last_checkin_date || (streak.current_streak ?? 0) < 1) return false;
  const last = new Date(streak.last_checkin_date);
  const today = new Date();
  const diffDays = Math.floor((today.getTime() - last.getTime()) / 86400000);
  return diffDays > 1;
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );

  async function requestPermission(): Promise<NotificationPermission> {
    if (typeof Notification === "undefined") return "denied";
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }

  function sendNotification(title: string, options?: NotificationOptions): void {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    new Notification(title, options);
  }

  return { requestPermission, sendNotification, permission };
}
