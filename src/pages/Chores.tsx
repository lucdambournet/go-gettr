import { useState } from "react";
import { entities } from "@/api/entities";
import { type Profile, type Chore } from "@/types/entities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ListChecks, Pencil, DollarSign, Users, Repeat2, Star } from "lucide-react";
import PersonAvatar from "@/components/shared/PersonAvatar";
import EmptyState from "@/components/shared/EmptyState";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import ChoreDialog, { getChoreIcon } from "@/components/chores/ChoreDialog";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

const FREQ_LABELS = {
  daily: { label: "Every Day", color: "bg-blue-500/15 text-blue-600 border-blue-400/30" },
  twice_daily: { label: "Twice Daily", color: "bg-purple-500/15 text-purple-600 border-purple-400/30" },
  weekly: { label: "Weekly", color: "bg-emerald-500/15 text-emerald-600 border-emerald-400/30" },
};

function getFreqDisplay(frequency: string | undefined): { label: string; color: string } {
  if (!frequency) return FREQ_LABELS.weekly;
  if (FREQ_LABELS[frequency as keyof typeof FREQ_LABELS]) return FREQ_LABELS[frequency as keyof typeof FREQ_LABELS];
  if (frequency.startsWith("2x:")) return { label: `2× ${frequency.slice(3).toUpperCase()}`, color: "bg-purple-500/15 text-purple-600 border-purple-400/30" };
  const days = frequency.split(",").map(d => d.trim().slice(0, 3).charAt(0).toUpperCase() + d.trim().slice(1, 3)).join(", ");
  return { label: days, color: "bg-indigo-500/15 text-indigo-600 border-indigo-400/30" };
}

function ChoreCard({ chore, onEdit, onDelete }: { chore: Chore; onEdit: (chore: Chore) => void; onDelete: (id: string) => void; isDeleting?: boolean }) {
  const [hovered, setHovered] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const ChoreIcon = getChoreIcon(chore.icon);
  const hasPayout = (chore.payout_per_completion ?? 0) > 0;
  const freq = getFreqDisplay(chore.frequency);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.88, x: 30, transition: { duration: 0.2 } }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => { setHovered(false); setConfirmDelete(false); }}
      className="relative rounded-2xl border bg-card overflow-hidden shadow-sm hover:shadow-xl transition-shadow group"
    >
      {/* Colored left bar */}
      <motion.div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
        animate={{ opacity: hovered ? 1 : 0.4 }}
        style={{ background: hasPayout ? "linear-gradient(180deg, #10b981, #34d399)" : "linear-gradient(180deg, hsl(var(--primary)), hsl(var(--primary)/0.5))" }}
      />

      <div className="p-4 pl-5">
        {/* Top row */}
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <ChoreIcon className="w-5 h-5 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground text-sm leading-tight mb-1">{chore.title}</h3>
            {chore.description && (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-2">{chore.description}</p>
            )}
            <div className="flex flex-wrap gap-1.5 items-center">
              <Badge className={cn("text-[10px] px-2 py-0 h-5 border font-semibold", freq.color)}>
                <Repeat2 className="w-2.5 h-2.5 mr-1" />{freq.label}
              </Badge>
              {hasPayout && (
                <Badge className="text-[10px] px-2 py-0 h-5 border bg-emerald-500/10 text-emerald-600 border-emerald-400/30 font-bold">
                  <DollarSign className="w-2.5 h-2.5" />{(chore.payout_per_completion ?? 0).toFixed(2)} each
                </Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          <AnimatePresence>
            {hovered && (
              <motion.div
                initial={{ opacity: 0, x: 8, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 8, scale: 0.9 }}
                transition={{ duration: 0.15 }}
                className="flex gap-1 shrink-0"
              >
                <motion.button
                  whileHover={{ scale: 1.2, backgroundColor: "hsl(var(--secondary))" }}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => onEdit(chore)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </motion.button>
                {confirmDelete ? (
                  <motion.button
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onDelete(chore.id)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-black"
                  >
                    ✓
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.85 }}
                    onClick={() => setConfirmDelete(true)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </motion.button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

export default function Chores() {
  const [addOpen, setAddOpen] = useState(false);
  const [editChore, setEditChore] = useState<Chore | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const onMutationError = (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" });

  const { data: chores = [], isLoading, isError, error } = useQuery({ queryKey: ["chores"], queryFn: () => entities.Chore.list() as Promise<Chore[]> });
  const { data: people = [] } = useQuery({ queryKey: ["people"], queryFn: () => entities.Profile.list() as unknown as Promise<Profile[]> });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Chore>) => {
      if (import.meta.env.DEV) console.log('[Chores] creating chore', { name: data.title, assignedTo: data.assigned_to });
      return entities.Chore.create(data) as Promise<Chore>;
    },
    onSuccess: () => {
      if (import.meta.env.DEV) console.log('[Chores] chore created successfully');
      queryClient.invalidateQueries({ queryKey: ["chores"] });
      setAddOpen(false);
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('[Chores] create chore failed', { error });
      onMutationError(error);
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Chore> }) => {
      if (import.meta.env.DEV) console.log('[Chores] updating chore', { choreId: id, changes: data });
      return entities.Chore.update(id, data) as Promise<Chore>;
    },
    onSuccess: () => {
      if (import.meta.env.DEV) console.log('[Chores] chore updated successfully');
      queryClient.invalidateQueries({ queryKey: ["chores"] });
      setEditChore(null);
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('[Chores] update chore failed', { error });
      onMutationError(error);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      const chore = chores.find((c) => c.id === id);
      if (import.meta.env.DEV) console.log('[Chores] deleting chore', { choreId: id, choreName: chore?.title });
      return entities.Chore.delete(id) as unknown as Promise<void>;
    },
    onSuccess: () => {
      if (import.meta.env.DEV) console.log('[Chores] chore deleted successfully');
      queryClient.invalidateQueries({ queryKey: ["chores"] });
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('[Chores] delete chore failed', { error });
      onMutationError(error);
    },
  });

  const handleEditChore = (chore: Chore) => {
    if (import.meta.env.DEV) console.log('[Chores] edit chore dialog opened', { choreId: chore.id, choreName: chore.title });
    setEditChore(chore);
  };

  const activePeople = people.filter((p) => p.active !== false);
  const activeChores = chores.filter((c) => c.active !== false);

  const byPerson = activePeople.map((person) => ({
    person,
    chores: activeChores.filter((c) => c.assigned_to === person.id),
  })).filter((g) => g.chores.length > 0);

  const unassigned = activeChores.filter((c) => !people.find((p) => p.id === c.assigned_to));

  const pipeColors = ["#6366f1", "#f59e0b", "#ec4899", "#06b6d4", "#8b5cf6", "#10b981"];

  if (isLoading) return (
    <div className="flex items-center justify-center py-24">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.75, ease: "linear" }}
        className="w-7 h-7 border-[3px] border-primary border-t-transparent rounded-full" />
    </div>
  );
  if (isError) return <ErrorAlert error={error} />;

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 22 }}
      >
        <div className="relative -mx-4 md:-mx-8 -mt-4 md:-mt-8 px-4 md:px-8 pt-8 md:pt-10 pb-6 overflow-hidden"
          style={{ background: "linear-gradient(135deg, #10b98128 0%, #10b98110 60%, transparent 100%)" }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 70% 50%, #10b9811e 0%, transparent 65%)" }} />
          <div className="flex items-center justify-between relative">
            <div>
              <h1 className="text-3xl font-black text-foreground tracking-tight font-nunito">Chores</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {activeChores.length} chore{activeChores.length !== 1 ? "s" : ""} across {activePeople.length} people
              </p>
            </div>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }}>
              <Button
                className="gap-2 rounded-xl shadow-lg shadow-primary/20 font-semibold h-10"
                disabled={activePeople.length === 0}
                onClick={() => { if (import.meta.env.DEV) console.log('[Chores] add chore dialog opened'); setAddOpen(true); }}
              >
                <motion.span animate={addOpen ? { rotate: 45 } : { rotate: 0 }} transition={{ type: "spring", stiffness: 300 }} className="flex">
                  <Plus className="w-4 h-4" />
                </motion.span>
                Add Chore
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <ChoreDialog open={addOpen} onOpenChange={setAddOpen} chore={null} people={activePeople}
        onSave={(data) => createMutation.mutate(data)} isSaving={createMutation.isPending} />
      <ChoreDialog open={!!editChore} onOpenChange={(v) => !v && setEditChore(null)} chore={editChore} people={activePeople}
        onSave={(data) => editChore && updateMutation.mutate({ id: editChore.id, data })} isSaving={updateMutation.isPending} />

      <AnimatePresence>
        {activePeople.length === 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 flex items-center gap-2">
              <Users className="w-4 h-4 shrink-0" />
              Add people to your group first before creating chores.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="popLayout">
        {activeChores.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <EmptyState icon={ListChecks} title="No chores yet" description="Create chores and assign them to group members." />
          </motion.div>
        ) : (
          <motion.div key="content" className="space-y-10">
            {byPerson.map(({ person, chores: pChores }, gi) => {
              const accent = pipeColors[gi % pipeColors.length];
              const totalWeeklyPayout = pChores.reduce((s, c) => {
                const freq = c.frequency || "weekly";
                const perWeek = freq === "daily" ? 7 : freq === "twice_daily" ? 14 : 1;
                return s + (c.payout_per_completion || 0) * perWeek;
              }, 0);

              return (
                <motion.div
                  key={person.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: gi * 0.08, type: "spring", stiffness: 180 }}
                >
                  {/* Person header — enhanced */}
                  <motion.div
                    className="flex items-center gap-4 mb-5 p-4 rounded-2xl border"
                    style={{ borderColor: `${accent}44`, background: `${accent}08` }}
                  >
                    <div className="relative">
                      <PersonAvatar name={person.name} avatarColor={person.avatar_color} colorIndex={gi} size="lg" />
                      {/* Dot indicator */}
                      <motion.div
                        className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-card flex items-center justify-center"
                        style={{ background: accent }}
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-black text-foreground text-lg font-nunito">{person.name}</h2>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground">{pChores.length} chore{pChores.length !== 1 ? "s" : ""}</span>
                        {totalWeeklyPayout > 0 && (
                          <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-400/30 border font-bold">
                            <Star className="w-2.5 h-2.5 mr-1" />~${totalWeeklyPayout.toFixed(2)}/wk
                          </Badge>
                        )}
                      </div>
                    </div>
                    {/* Mini chore count badges */}
                    <div className="text-right shrink-0">
                      <div className="text-2xl font-black tabular-nums" style={{ color: accent }}>{pChores.length}</div>
                      <div className="text-[10px] text-muted-foreground">chores</div>
                    </div>
                  </motion.div>

                  {/* Chore list */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    <AnimatePresence>
                      {pChores.map((chore, ci) => (
                        <motion.div key={chore.id} custom={ci}>
                          <ChoreCard
                            chore={chore}
                            onEdit={handleEditChore}
                            onDelete={(id) => deleteMutation.mutate(id)}
                            isDeleting={deleteMutation.isPending}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}

            {/* Unassigned */}
            {unassigned.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  Unassigned ({unassigned.length})
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {unassigned.map((chore) => (
                    <ChoreCard key={chore.id} chore={chore} onEdit={handleEditChore} onDelete={(id) => deleteMutation.mutate(id)} />
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
