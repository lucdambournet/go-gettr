import { useState, useEffect, type ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import ColorPicker from "@/components/people/ColorPicker";
import { getAvatarStyle } from "@/components/people/colorUtils";
import { Shield, User, Bell, DollarSign, Star } from "lucide-react";
import { type Profile } from "@/types/entities";
import { cn } from "@/lib/utils";

const STAGGER_DELAY = 0.06;

function FormField({ label, children, index = 0 }: { label: string; children: ReactNode; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * STAGGER_DELAY, type: "spring", stiffness: 260, damping: 24 }}
      className="space-y-2"
    >
      <Label>{label}</Label>
      {children}
    </motion.div>
  );
}

interface PersonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person?: Profile | null;
  onSave: (data: Partial<Profile>) => void;
  isSaving?: boolean;
}

export default function PersonDialog({ open, onOpenChange, person, onSave, isSaving }: PersonDialogProps) {
  const isEdit = !!person;
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [allowance, setAllowance] = useState("");
  const [color, setColor] = useState("#6d5bd0");
  const [role, setRole] = useState<'parent' | 'child'>('child');
  const [notifyOnRequest, setNotifyOnRequest] = useState(true);
  const [maxPayout, setMaxPayout] = useState("");

  useEffect(() => {
    if (open) {
      setFirstName(person?.first_name || "");
      setLastName(person?.last_name || "");
      setAllowance(person?.weekly_allowance != null ? String(person.weekly_allowance) : "");
      const style = getAvatarStyle(person?.avatar_color);
      setColor(style.hex);
      setRole(person?.role ?? 'child');
      setNotifyOnRequest(person?.notify_on_payout_request !== false);
      setMaxPayout(person?.max_single_payout != null ? String(person.max_single_payout) : "");
    }
  }, [open, person]);

  const handleSave = () => {
    if (!firstName.trim()) return;
    const base: Partial<Profile> = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      avatar_color: color,
      active: true,
      role,
    };
    if (role === 'parent') {
      onSave({ ...base, notify_on_payout_request: notifyOnRequest, max_single_payout: parseFloat(maxPayout) || null, weekly_allowance: 0 });
    } else {
      onSave({ ...base, weekly_allowance: parseFloat(allowance) || 0 });
    }
  };

  const initial = (firstName || "?")[0].toUpperCase();
  const isParent = role === 'parent';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Person" : "Add a Person"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Avatar preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.6, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 20 }}
            className="flex justify-center"
          >
            <div className="relative">
              <motion.div
                animate={{ boxShadow: [`0 0 0 0px ${color}44`, `0 0 0 8px ${color}22`, `0 0 0 0px ${color}00`] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="rounded-full"
              >
                <motion.div
                  key={color + initial}
                  initial={{ scale: 0.75, rotate: -12, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 320, damping: 18 }}
                  className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black text-white shadow-2xl ring-4 ring-white/30"
                  style={{ background: `radial-gradient(circle at 35% 35%, ${color}ee, ${color}99)` }}
                >
                  {initial}
                </motion.div>
              </motion.div>
              <motion.div
                key={String(isParent)}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 18 }}
                className={cn(
                  "absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-card",
                  isParent ? "bg-amber-500" : "bg-primary"
                )}
              >
                {isParent ? <Shield className="w-4 h-4 text-white" /> : <Star className="w-4 h-4 text-white" />}
              </motion.div>
            </div>
          </motion.div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="First name" index={0}>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" autoFocus={!isEdit} />
            </FormField>
            <FormField label="Last name" index={1}>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Smith" />
            </FormField>
          </div>

          <FormField label="Avatar Color" index={2}>
            <ColorPicker value={color} onChange={setColor} />
          </FormField>

          <FormField label="Role" index={3}>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: 'child' as const,  icon: User,   label: "Child",  desc: "Earns rewards & allowance", gradient: "from-primary/10 to-primary/5" },
                { value: 'parent' as const, icon: Shield, label: "Parent", desc: "Approves payouts & manages",  gradient: "from-amber-500/10 to-amber-500/5" },
              ]).map(({ value, icon: Icon, label, desc, gradient }) => (
                <motion.button
                  key={value}
                  type="button"
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 360, damping: 22 }}
                  onClick={() => setRole(value)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all",
                    role === value
                      ? value === 'parent' ? "border-amber-500 bg-gradient-to-br " + gradient : "border-primary bg-gradient-to-br " + gradient
                      : "border-border hover:border-primary/40 bg-card"
                  )}
                >
                  <motion.div
                    animate={role === value ? { rotate: [0, -10, 10, 0], scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 0.4 }}
                    className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                      role === value
                        ? value === 'parent' ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30" : "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                        : "bg-secondary text-muted-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </motion.div>
                  <div>
                    <div className="text-sm font-bold text-foreground">{label}</div>
                    <div className="text-[11px] text-muted-foreground leading-tight">{desc}</div>
                  </div>
                </motion.button>
              ))}
            </div>
          </FormField>

          <AnimatePresence mode="wait">
            {!isParent ? (
              <motion.div
                key="child-settings"
                initial={{ opacity: 0, height: 0, y: -8 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -8 }}
                transition={{ type: "spring", stiffness: 300, damping: 26 }}
                className="overflow-hidden"
              >
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5 text-muted-foreground" /> Weekly Allowance ($)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input
                      type="number" min="0" step="0.01"
                      value={allowance}
                      onChange={(e) => setAllowance(e.target.value)}
                      placeholder="0.00"
                      className="pl-7"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">Earned when all weekly chores are completed.</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="parent-settings"
                initial={{ opacity: 0, height: 0, y: -8 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -8 }}
                transition={{ type: "spring", stiffness: 300, damping: 26 }}
                className="overflow-hidden"
              >
                <div className="space-y-4 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/15">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                    <Shield className="w-3.5 h-3.5" /> Parent Settings
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 flex-1">
                      <Bell className="w-4 h-4 text-amber-500 shrink-0" />
                      <div>
                        <div className="text-sm font-semibold text-foreground">Notify on cash-out requests</div>
                        <div className="text-[11px] text-muted-foreground">Get alerted when a child requests a payout</div>
                      </div>
                    </div>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.92 }}
                      onClick={() => setNotifyOnRequest(v => !v)}
                      className={cn(
                        "w-11 h-6 rounded-full transition-all duration-300 relative shrink-0",
                        notifyOnRequest ? "bg-amber-500" : "bg-secondary"
                      )}
                    >
                      <motion.div
                        animate={{ x: notifyOnRequest ? 20 : 2 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
                      />
                    </motion.button>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-2 text-xs">
                      <DollarSign className="w-3.5 h-3.5 text-amber-500" /> Max single payout ($)
                      <span className="text-muted-foreground font-normal">optional</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <Input
                        type="number" min="0" step="0.50"
                        value={maxPayout}
                        onChange={(e) => setMaxPayout(e.target.value)}
                        placeholder="No limit"
                        className="pl-7 h-9 text-sm"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">Set a cap on how much can be paid out at once.</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, type: "spring", stiffness: 260, damping: 24 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              onClick={handleSave}
              disabled={!firstName.trim() || isSaving}
              className={cn(
                "w-full h-11 font-bold text-base rounded-xl",
                isParent && "bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-white shadow-lg shadow-amber-500/20 border-0"
              )}
            >
              {isSaving ? (isEdit ? "Saving..." : "Adding...") : (isEdit ? "Save Changes" : `Add ${isParent ? "Parent" : "Child"}`)}
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
