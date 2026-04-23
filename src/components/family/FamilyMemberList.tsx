import { entities } from '@/api/entities';
import { useAuth } from '@/lib/AuthContext';
import { COLOR_PALETTE, getAvatarStyle } from '@/components/people/colorUtils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { UserMinus, Clock } from 'lucide-react';
import type { Profile, FamilyInvitation } from '@/types/entities';

function profileAvatarStyle(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return getAvatarStyle(COLOR_PALETTE[Math.abs(h) % COLOR_PALETTE.length].hex);
}

export default function FamilyMemberList() {
  const { family, profile: currentProfile, isParent } = useAuth();
  const queryClient = useQueryClient();

  const { data: members = [] } = useQuery({
    queryKey: ['family-profiles', family?.id],
    enabled: !!family?.id,
    queryFn: () => entities.Profile.filter({ family_id: family!.id }) as unknown as Promise<Profile[]>,
  });

  const { data: pendingInvites = [] } = useQuery({
    queryKey: ['family-invitations', family?.id],
    enabled: !!family?.id && isParent,
    queryFn: () =>
      entities.FamilyInvitation.filter({ family_id: family!.id, status: 'pending' }) as Promise<FamilyInvitation[]>,
  });

  const removeMember = useMutation({
    mutationFn: (profileId: string) => entities.Profile.update(profileId, { family_id: null }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['family-profiles', family?.id] }),
  });

  const cancelInvite = useMutation({
    mutationFn: (inviteId: string) => entities.FamilyInvitation.delete(inviteId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['family-invitations', family?.id] }),
  });

  if (!family) return null;

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {members.map((member, i) => {
          const initials = `${member.first_name[0]}${member.last_name[0]}`.toUpperCase();
          const style = profileAvatarStyle(`${member.first_name}${member.last_name}`);
          const isCurrentUser = member.id === currentProfile?.id;

          return (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40 border border-border/50"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0"
                style={{ background: style.hex }}
              >
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground truncate">
                  {member.first_name} {member.last_name}
                  {isCurrentUser && <span className="ml-1.5 text-xs text-muted-foreground font-normal">(you)</span>}
                </div>
                <div className="text-xs text-muted-foreground truncate">{member.email}</div>
              </div>
              <Badge
                variant="outline"
                className={`text-[10px] font-bold capitalize shrink-0 ${
                  member.role === 'parent'
                    ? 'border-primary/40 text-primary bg-primary/8'
                    : 'border-border text-muted-foreground'
                }`}
              >
                {member.role}
              </Badge>
              {isParent && !isCurrentUser && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                  onClick={() => removeMember.mutate(member.id)}
                  disabled={removeMember.isPending}
                >
                  <UserMinus className="w-3.5 h-3.5" />
                </Button>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {isParent && pendingInvites.length > 0 && (
        <div className="pt-2 space-y-1.5">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
            Pending Invites
          </div>
          {pendingInvites.map((invite) => (
            <motion.div
              key={invite.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-border/60 bg-secondary/20"
            >
              <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground truncate">{invite.email}</div>
                <div className="text-xs text-muted-foreground capitalize">{invite.role} · Pending</div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 rounded-xl text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                onClick={() => cancelInvite.mutate(invite.id)}
                disabled={cancelInvite.isPending}
              >
                Cancel
              </Button>
            </motion.div>
          ))}
        </div>
      )}

      {members.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">No family members yet.</p>
      )}
    </div>
  );
}
