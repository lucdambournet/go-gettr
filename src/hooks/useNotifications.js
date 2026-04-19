import { useState } from "react";

export function isStreakAtRisk(streak) {
  if (!streak || !streak.last_checkin_date || streak.current_streak < 1) return false;
  const last = new Date(streak.last_checkin_date);
  const today = new Date();
  const diffDays = Math.floor((today - last) / 86400000);
  return diffDays === 1;
}

export function hasStreakBroken(streak) {
  if (!streak || !streak.last_checkin_date || streak.current_streak < 1) return false;
  const last = new Date(streak.last_checkin_date);
  const today = new Date();
  const diffDays = Math.floor((today - last) / 86400000);
  return diffDays > 1;
}

export function useNotifications() {
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );

  async function requestPermission() {
    if (typeof Notification === "undefined") return "denied";
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }

  function sendNotification(title, options) {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    new Notification(title, options);
  }

  return { requestPermission, sendNotification, permission };
}
