import { useMemo } from "react";
import { entities } from "@/api/entities";
import { type Notification, type Profile } from "@/types/entities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/components/shared/weekUtils";
import PersonAvatar from "@/components/shared/PersonAvatar";

const TYPE_META = {
  chore_completed: { color: "bg-emerald-500/10 border-emerald-500/20 text-emerald-700", dot: "bg-emerald-500", defaultIcon: "✅" },
  payout_approved: { color: "bg-amber-500/10 border-amber-500/20 text-amber-700", dot: "bg-amber-500", defaultIcon: "💰" },
  payout_requested: { color: "bg-blue-500/10 border-blue-500/20 text-blue-700", dot: "bg-blue-500", defaultIcon: "🏦" },
  streak_broken: { color: "bg-red-500/10 border-red-500/20 text-red-700", dot: "bg-red-500", defaultIcon: "💔" },
  streak_milestone: { color: "bg-orange-500/10 border-orange-500/20 text-orange-700", dot: "bg-orange-500", defaultIcon: "🔥" },
  achievement_unlocked: { color: "bg-purple-500/10 border-purple-500/20 text-purple-700", dot: "bg-purple-500", defaultIcon: "🏆" },
};

function NotificationItem({ notif, people, onMarkRead, onDelete, index }: {
  notif: Notification;
  people: Profile[];
  onMarkRead: (n: Notification) => void;
  onDelete: (n: Notification) => void;
  index: number;
}) {
  const meta = TYPE_META[notif.type as keyof typeof TYPE_META] || TYPE_META.chore_completed;
  const person = people.find((p: Profile) => p.id === notif.profile_id);
  const timeAgo = useMemo(() => {
    const diff = Date.now() - new Date(notif.created_date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }, [notif.created_date]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -24, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, scale: 0.95 }}
      transition={{ delay: index * 0.04, type: "spring", stiffness: 220, damping: 24 }}
      layout
    >
      <div className={cn(
        "flex items-start gap-3 p-4 rounded-2xl border transition-all",
        meta.color,
        !notif.read && "shadow-sm"
      )}>
        {/* Unread dot */}
        <div className="relative shrink-0 mt-1">
          <div className="text-2xl leading-none">{notif.icon || meta.defaultIcon}</div>
          {!notif.read && (
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              className={cn("absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-card", meta.dot)}
            />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("text-sm font-bold", !notif.read ? "" : "opacity-75")}>{notif.title}</span>
            {person && (
              <PersonAvatar name={person.name} avatarColor={person.avatar_color} size="sm" />
            )}
          </div>
          <p className="text-xs mt-0.5 opacity-80 leading-relaxed">{notif.message}</p>
          <p className="text-[10px] mt-1 opacity-50 font-medium">{timeAgo}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {!notif.read && (
            <motion.button
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={() => onMarkRead(notif)}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/10 transition-colors"
              title="Mark as read"
            >
              <CheckCheck className="w-3.5 h-3.5" />
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={() => onDelete(notif)}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/10 transition-colors opacity-50 hover:opacity-100"
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

export default function Notifications() {
  const queryClient = useQueryClient();
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => entities.Notification.list("-created_date", 100) as Promise<Notification[]>,
  });
  const { data: people = [] } = useQuery({
    queryKey: ["people"],
    queryFn: () => entities.Profile.list() as unknown as Promise<Profile[]>,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Notification> }) => entities.Notification.update(id, data) as Promise<Notification>,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => entities.Notification.delete(id) as unknown as Promise<void>,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    await Promise.all(unread.map(n => updateMutation.mutateAsync({ id: n.id, data: { read: true } })));
  };

  const grouped = useMemo(() => {
    const today = formatDate(new Date());
    const yesterday = formatDate(new Date(Date.now() - 86400000));
    const groups: Record<string, Notification[]> = { Today: [], Yesterday: [], Earlier: [] };
    notifications.forEach((n: Notification) => {
      const d = n.created_date ? n.created_date.slice(0, 10) : "";
      if (d === today) groups.Today.push(n);
      else if (d === yesterday) groups.Yesterday.push(n);
      else groups.Earlier.push(n);
    });
    return groups;
  }, [notifications]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="relative -mx-4 md:-mx-8 -mt-4 md:-mt-8 px-4 md:px-8 pt-8 md:pt-10 pb-6 overflow-hidden"
          style={{ background: "linear-gradient(135deg, #ec489928 0%, #ec489910 60%, transparent 100%)" }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 20% 50%, #ec48991e 0%, transparent 70%)" }} />
          <div className="flex items-center justify-between relative">
            <div>
              <h1 className="text-3xl font-black text-foreground tracking-tight font-nunito flex items-center gap-3">
                <Bell className="w-7 h-7 text-primary" /> Notifications
                {unreadCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="text-sm bg-primary text-primary-foreground rounded-full px-2.5 py-0.5 font-bold tabular-nums"
                  >
                    {unreadCount}
                  </motion.span>
                )}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Your activity history</p>
            </div>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" className="gap-2 rounded-xl bg-background/70 backdrop-blur-sm" onClick={markAllRead}>
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      <div className="max-w-2xl mx-auto space-y-8">
      {/* Empty state */}
      {notifications.length === 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="py-20 text-center">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                className="text-5xl mb-4"
              >
                🔔
              </motion.div>
              <p className="text-muted-foreground font-medium">No notifications yet</p>
              <p className="text-sm text-muted-foreground mt-1">Complete chores and check in to earn rewards!</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Grouped notifications */}
      <AnimatePresence>
        {Object.entries(grouped).map(([group, items]) =>
          items.length === 0 ? null : (
            <motion.div key={group} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">{group}</h2>
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {items.map((n, i) => (
                    <NotificationItem
                      key={n.id}
                      notif={n}
                      people={people}
                      index={i}
                      onMarkRead={(n) => updateMutation.mutate({ id: n.id, data: { read: true } })}
                      onDelete={(n) => deleteMutation.mutate(n.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}