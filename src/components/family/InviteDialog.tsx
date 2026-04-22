import { useState } from 'react';
import { entities, searchProfileByEmail, addProfileToFamily } from '@/api/entities';
import { useAuth } from '@/lib/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Mail, UserCheck, UserPlus, Copy, Check } from 'lucide-react';
import type { Profile } from '@/types/entities';

type InviteRole = 'parent' | 'child';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type SearchResult =
  | { type: 'found'; profile: Profile }
  | { type: 'not-found' }
  | { type: 'already-member' };

export default function InviteDialog({ open, onOpenChange }: Props) {
  const { family } = useAuth();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InviteRole>('child');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  const reset = () => {
    setEmail('');
    setRole('child');
    setSearching(false);
    setSearchResult(null);
    setInviteLink(null);
    setCopied(false);
    setActionPending(false);
    setSuccessMsg('');
    setError('');
  };

  const handleSearch = async () => {
    if (!email.trim()) return;
    setSearching(true);
    setSearchResult(null);
    setInviteLink(null);
    setSuccessMsg('');
    setError('');

    try {
      const results = await searchProfileByEmail(email.trim().toLowerCase());
      if (results.length === 0) {
        setSearchResult({ type: 'not-found' });
      } else {
        const found = results[0] as Profile;
        if (found.family_id) {
          setSearchResult({ type: 'already-member' });
        } else {
          setSearchResult({ type: 'found', profile: found });
        }
      }
    } catch {
      setError('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleAddExisting = async (profileId: string) => {
    if (!family) return;
    setActionPending(true);
    setError('');
    try {
      await addProfileToFamily(profileId, role);
      queryClient.invalidateQueries({ queryKey: ['family-profiles'] });
      setSuccessMsg('Member added to your family!');
      setSearchResult(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add member.');
    } finally {
      setActionPending(false);
    }
  };

  const handleSendInvite = async () => {
    if (!family || !email.trim()) return;
    setActionPending(true);
    setError('');
    try {
      const invite = await entities.FamilyInvitation.create({
        family_id: family.id,
        email: email.trim().toLowerCase(),
        role,
      });

      const link = `${window.location.origin}/invite?token=${invite.token}`;
      setInviteLink(link);
      setSuccessMsg('Invitation created! Share the link below.');

      // TODO: call send-invitation edge function to email the link
      // await supabase.functions.invoke('send-invitation', { body: { invitationId: invite.id } });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create invitation.');
    } finally {
      setActionPending(false);
    }
  };

  const copyLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md w-[calc(100%-2rem)] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <UserPlus className="w-4 h-4 text-primary" />
            Invite a Family Member
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Role selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Role</label>
            <div className="flex gap-2">
              {(['parent', 'child'] as InviteRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-all capitalize ${
                    role === r
                      ? 'border-primary bg-primary/8 text-primary'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/40'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Email input + search */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Email address</label>
            <div className="flex gap-2">
              <Input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setSearchResult(null); setSuccessMsg(''); setError(''); }}
                placeholder="jane@example.com"
                className="h-10 rounded-xl flex-1"
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
              <Button
                variant="outline"
                size="sm"
                className="h-10 rounded-xl px-3 shrink-0"
                onClick={handleSearch}
                disabled={searching || !email.trim()}
              >
                {searching
                  ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  : <Search className="w-4 h-4" />
                }
              </Button>
            </div>
          </div>

          {/* Search result */}
          <AnimatePresence mode="wait">
            {searchResult && (
              <motion.div
                key={searchResult.type}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
              >
                {searchResult.type === 'found' && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-xs font-black text-primary shrink-0">
                      {searchResult.profile.first_name[0]}{searchResult.profile.last_name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground">
                        {searchResult.profile.first_name} {searchResult.profile.last_name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{searchResult.profile.email}</div>
                    </div>
                    <Button
                      size="sm"
                      className="h-8 rounded-xl gap-1.5 text-xs shrink-0"
                      onClick={() => handleAddExisting(searchResult.profile.id)}
                      disabled={actionPending}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Add
                    </Button>
                  </div>
                )}

                {searchResult.type === 'already-member' && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
                    This user is already in a family.
                  </div>
                )}

                {searchResult.type === 'not-found' && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border">
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-foreground">No account found</div>
                      <div className="text-xs text-muted-foreground">Send them an invite link</div>
                    </div>
                    <Button
                      size="sm"
                      className="h-8 rounded-xl gap-1.5 text-xs shrink-0"
                      onClick={handleSendInvite}
                      disabled={actionPending}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      Send Invite
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Invite link */}
          <AnimatePresence>
            {inviteLink && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-2 pt-1">
                  <div className="text-xs font-semibold text-foreground">Invite link</div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary/60 border border-border">
                    <span className="text-xs text-muted-foreground flex-1 truncate font-mono">{inviteLink}</span>
                    <button
                      onClick={copyLink}
                      className="shrink-0 p-1 rounded-lg hover:bg-secondary transition-colors"
                    >
                      {copied
                        ? <Check className="w-3.5 h-3.5 text-emerald-500" />
                        : <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                      }
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Share this link with the invitee. It expires in 7 days.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {successMsg && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">{successMsg}</p>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
