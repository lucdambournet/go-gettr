import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function useNotificationBadge() {
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications-badge"],
    queryFn: () => base44.entities.Notification.list(),
    refetchInterval: 30000,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;
  return { unreadCount };
}
