import { useQuery } from "@tanstack/react-query";
import { entities } from "@/api/entities";

export function useNotificationBadge(): { unreadCount: number } {
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications-badge"],
    queryFn: () => entities.Notification.list() as Promise<Array<{ read: boolean }>>,
    refetchInterval: 30000,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;
  return { unreadCount };
}
