import { useMemo } from "react";
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Users, UserPlus } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import PersonDialog from "@/components/people/PersonDialog";
import PersonContactCard from "@/components/people/PersonContactCard";
import { motion, AnimatePresence } from "framer-motion";
import { getWeekStart, getWeekDays, formatDate, choreWeekStats } from "@/components/shared/weekUtils";

export default function People() {
  const [addOpen, setAddOpen] = useState(false);
  const [editPerson, setEditPerson] = useState(null);
  const queryClient = useQueryClient();

  const weekStart = getWeekStart();
  const weekDays = getWeekDays(weekStart);
  const weekStartStr = formatDate(weekStart);

  const { data: people = [], isLoading } = useQuery({ queryKey: ["people"], queryFn: () => base44.entities.Person.list() });
  const { data: chores = [] } = useQuery({ queryKey: ["chores"], queryFn: () => base44.entities.Chore.list() });
  const { data: logs = [] } = useQuery({
    queryKey: ["choreLogs", weekStartStr],
    queryFn: () => base44.entities.ChoreLog.filter({ week_start: weekStartStr }),
  });
  const { data: streaks = [] } = useQuery({ queryKey: ["streaks"], queryFn: () => base44.entities.Streak.list() });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Person.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["people"] }); setAddOpen(false); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Person.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["people"] }); setEditPerson(null); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Person.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["people"] }),
  });

  const activePeople = people.filter((p) => p.active !== false);
  const activeChores = chores.filter((c) => c.active !== false);

  const logMap = useMemo(() => {
    const map = {};
    logs.forEach((log) => { if (log.completed) map[`${log.chore_id}_${log.day}`] = true; });
    return map;
  }, [logs]);

  const streakMap = useMemo(() => Object.fromEntries(streaks.map((s) => [s.person_id, s])), [streaks]);

  // Compute per-person weekly stats
  const weeklyStatsMap = useMemo(() => {
    const map = {};
    activePeople.forEach((person) => {
      const personChores = activeChores.filter((c) => c.assigned_to === person.id);
      let expected = 0, done = 0;
      personChores.forEach((chore) => {
        const s = choreWeekStats(chore, weekDays, logMap);
        expected += s.expected;
        done += s.done;
      });
      map[person.id] = { expected, done };
    });
    return map;
  }, [activePeople, activeChores, logMap, weekDays]);

  if (isLoading) return (
    <div className="flex items-center justify-center py-24">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.75, ease: "linear" }}
        className="w-7 h-7 border-[3px] border-primary border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 22 }}
      >
        <div className="relative -mx-4 md:-mx-8 -mt-4 md:-mt-8 px-4 md:px-8 pt-8 md:pt-10 pb-6 overflow-hidden"
          style={{ background: "linear-gradient(135deg, #6366f128 0%, #6366f110 60%, transparent 100%)" }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 30% 80%, #6366f11e 0%, transparent 65%)" }} />
          <div className="flex items-end justify-between relative">
            <div>
              <h1 className="text-3xl font-black text-foreground tracking-tight font-nunito">People</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {activePeople.length} member{activePeople.length !== 1 ? "s" : ""} in your group
              </p>
            </div>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }}>
              <Button className="gap-2 rounded-xl shadow-lg shadow-primary/20 font-semibold h-10" onClick={() => setAddOpen(true)}>
                <motion.span animate={addOpen ? { rotate: 45 } : { rotate: 0 }} transition={{ type: "spring", stiffness: 300 }} className="flex">
                  <Plus className="w-4 h-4" />
                </motion.span>
                Add Person
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <PersonDialog open={addOpen} onOpenChange={setAddOpen} person={null}
        onSave={(data) => createMutation.mutate(data)} isSaving={createMutation.isPending} />
      <PersonDialog open={!!editPerson} onOpenChange={(v) => !v && setEditPerson(null)} person={editPerson}
        onSave={(data) => updateMutation.mutate({ id: editPerson.id, data })} isSaving={updateMutation.isPending} />

      <AnimatePresence mode="popLayout">
        {activePeople.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <EmptyState
              icon={Users}
              title="No people yet"
              description="Add people to your group to start assigning chores."
              action={
                <Button className="gap-2 mt-2" onClick={() => setAddOpen(true)}>
                  <UserPlus className="w-4 h-4" /> Add your first person
                </Button>
              }
            />
          </motion.div>
        ) : (
          <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <AnimatePresence>
              {activePeople.map((person, i) => (
                <PersonContactCard
                  key={person.id}
                  person={person}
                  index={i}
                  chores={activeChores.filter((c) => c.assigned_to === person.id)}
                  onEdit={() => setEditPerson(person)}
                  onDelete={() => deleteMutation.mutate(person.id)}
                  isDeleting={deleteMutation.isPending}
                  weeklyStats={weeklyStatsMap[person.id]}
                  streakData={streakMap[person.id]}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}