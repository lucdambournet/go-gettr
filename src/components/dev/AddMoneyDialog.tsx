import { useState } from "react";
import { type Person } from "@/types/entities";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, Zap } from "lucide-react";
import PersonAvatar from "@/components/shared/PersonAvatar";
import { cn } from "@/lib/utils";

const QUICK_AMOUNTS = [0.25, 0.50, 1, 2, 5, 10, 20];

interface AddMoneyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kids: Person[];
  onAdd: (person: Person, amount: number, note: string) => void;
}

export default function AddMoneyDialog({ open, onOpenChange, kids, onAdd }: AddMoneyDialogProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const handleAdd = () => {
    const parsed = parseFloat(amount);
    if (!selectedId || !parsed || parsed <= 0) return;
    const person = kids.find(k => k.id === selectedId);
    if (!person) return;
    onAdd(person, parsed, note.trim());
    setAmount("");
    setNote("");
    setSelectedId(null);
    onOpenChange(false);
  };

  const parsed = parseFloat(amount);
  const valid = selectedId && parsed > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </div>
            Add Money to Bank
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Person selector */}
          <div className="space-y-1.5">
            <Label className="text-xs">Who gets the money?</Label>
            <div className="flex flex-col gap-1.5">
              {kids.map((person, i) => (
                <button
                  key={person.id}
                  onClick={() => setSelectedId(person.id)}
                  className={cn(
                    "flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all",
                    selectedId === person.id
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/40 hover:bg-secondary/40"
                  )}
                >
                  <PersonAvatar name={person.name} avatarColor={person.avatar_color} colorIndex={i} size="sm" />
                  <span className="text-sm font-semibold text-foreground">{person.name}</span>
                  {selectedId === person.id && (
                    <span className="ml-auto text-xs text-primary font-bold">Selected</span>
                  )}
                </button>
              ))}
              {kids.length === 0 && (
                <p className="text-xs text-muted-foreground italic p-2">No kids found.</p>
              )}
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label className="text-xs">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">$</span>
              <Input
                type="number"
                min="0"
                step="0.25"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="pl-7 rounded-xl"
              />
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {QUICK_AMOUNTS.map(q => (
                <button
                  key={q}
                  onClick={() => setAmount(String(q))}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-bold border transition-all",
                    parseFloat(amount) === q
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary border-border hover:border-primary/50 text-foreground"
                  )}
                >
                  ${q}
                </button>
              ))}
            </div>
          </div>

          {/* Optional note */}
          <div className="space-y-1.5">
            <Label className="text-xs">Note <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              placeholder="e.g. Birthday money, bonus…"
              value={note}
              onChange={e => setNote(e.target.value)}
              className="rounded-xl text-sm"
            />
          </div>

          <Button
            className="w-full gap-2 h-10 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-600 text-white border-0"
            onClick={handleAdd}
            disabled={!valid}
          >
            <Zap className="w-4 h-4" />
            {valid ? `Add $${parsed.toFixed(2)} to ${kids.find(k => k.id === selectedId)?.name}` : "Add Money"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}