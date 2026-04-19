import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import DaySelector from "@/components/chores/DaySelector";
import {
  UtensilsCrossed, ShoppingCart, Shirt, Trash2, Wind, Droplets,
  Leaf, Car, Dog, Baby, Hammer, BookOpen, Package,
  Refrigerator, Sparkles, Bath, Bed, Soup,
  Apple, Flower2, Bug, Recycle, Lightbulb, Flame, Archive,
  Coffee, Sandwich, Wrench, TreePine, Brush,
} from "lucide-react";

export const CHORE_ICONS = [
  { key: "utensils",    label: "Dishes",      Icon: UtensilsCrossed },
  { key: "sparkles",    label: "Clean",       Icon: Sparkles },
  { key: "trash",       label: "Trash",       Icon: Trash2 },
  { key: "droplets",    label: "Mop/Moist",   Icon: Droplets },
  { key: "wind",        label: "Vacuum",      Icon: Wind },
  { key: "shirt",       label: "Fold",        Icon: Shirt },
  { key: "bath",        label: "Bathroom",    Icon: Bath },
  { key: "bed",         label: "Make Bed",    Icon: Bed },
  { key: "fridge",      label: "Fridge",      Icon: Refrigerator },
  { key: "soup",        label: "Cook",        Icon: Soup },
  { key: "apple",       label: "Groceries",   Icon: Apple },
  { key: "shopping",    label: "Shopping",    Icon: ShoppingCart },
  { key: "recycle",     label: "Recycling",   Icon: Recycle },
  { key: "leaf",        label: "Garden",      Icon: Leaf },
  { key: "flower",      label: "Plants",      Icon: Flower2 },
  { key: "tree",        label: "Yard",        Icon: TreePine },
  { key: "bug",         label: "Pest",        Icon: Bug },
  { key: "car",         label: "Car",         Icon: Car },
  { key: "dog",         label: "Pet",         Icon: Dog },
  { key: "baby",        label: "Kids",        Icon: Baby },
  { key: "hammer",      label: "Repairs",     Icon: Hammer },
  { key: "wrench",      label: "Fix",         Icon: Wrench },
  { key: "flame",       label: "Fireplace",   Icon: Flame },
  { key: "book",        label: "Study",       Icon: BookOpen },
  { key: "package",     label: "Storage",     Icon: Package },
  { key: "archive",     label: "Organize",    Icon: Archive },
  { key: "lightbulb",   label: "Errands",     Icon: Lightbulb },
  { key: "coffee",      label: "Coffee",      Icon: Coffee },
  { key: "sandwich",    label: "Lunch",       Icon: Sandwich },
  { key: "brush",       label: "Paint",       Icon: Brush },
];

export function getChoreIcon(key) {
  return CHORE_ICONS.find((i) => i.key === key)?.Icon || Sparkles;
}

export default function ChoreDialog({ open, onOpenChange, chore, people, onSave, isSaving }) {
  const isEdit = !!chore;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [frequency, setFrequency] = useState("weekly");
  const [iconKey, setIconKey] = useState("sparkles");
  const [payoutPerCompletion, setPayoutPerCompletion] = useState(0);

  useEffect(() => {
    if (open) {
      setTitle(chore?.title || "");
      setDescription(chore?.description || "");
      setAssignedTo(chore?.assigned_to || "");
      setFrequency(chore?.frequency || "weekly");
      setIconKey(chore?.icon || "sparkles");
      setPayoutPerCompletion(chore?.payout_per_completion || 0);
    }
  }, [open, chore]);

  const handleSave = () => {
    if (!title.trim() || !assignedTo) return;
    onSave({ title: title.trim(), description: description.trim(), assigned_to: assignedTo, frequency, icon: iconKey, active: true, payout_per_completion: Number(payoutPerCompletion) || 0 });
  };

  const SelectedIcon = getChoreIcon(iconKey);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Chore" : "Add a Chore"}</DialogTitle>
        </DialogHeader>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-5 pt-2"
        >
          {/* Icon preview */}
          <div className="flex justify-center">
            <motion.div
              key={iconKey}
              initial={{ scale: 0.7, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center"
            >
              <SelectedIcon className="w-7 h-7 text-primary" />
            </motion.div>
          </div>

          <div className="space-y-2">
            <Label>Chore Name</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Wash dishes" />
          </div>

          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="grid grid-cols-8 gap-1.5">
              {CHORE_ICONS.map(({ key, label, Icon }) => (
                <motion.button
                  key={key}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setIconKey(key)}
                  title={label}
                  className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center transition-all",
                    iconKey === key
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  )}
                >
                  <Icon className="w-4 h-4" />
                </motion.button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Any details..." rows={2} />
          </div>

          <div className="space-y-2">
            <Label>Assign To</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger><SelectValue placeholder="Select a person" /></SelectTrigger>
              <SelectContent>
                {people.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Frequency — which days?</Label>
            <DaySelector value={frequency} onChange={setFrequency} />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Pay per completion
              <span className="text-[10px] font-normal text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">optional</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                type="number"
                min="0"
                step="0.25"
                value={payoutPerCompletion || ""}
                onChange={(e) => setPayoutPerCompletion(e.target.value)}
                placeholder="0.00"
                className="pl-7"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">Each time this chore is checked off, this amount is earned.</p>
          </div>

          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
            <Button onClick={handleSave} disabled={!title.trim() || !assignedTo || isSaving} className="w-full">
              {isSaving ? (isEdit ? "Saving..." : "Adding...") : (isEdit ? "Save Changes" : "Add Chore")}
            </Button>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}