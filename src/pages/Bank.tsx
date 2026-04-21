// @ts-nocheck
import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { entities } from "@/api/entities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, TrendingUp, Coins, ShieldCheck, AlertCircle } from "lucide-react";
import PersonAvatar from "@/components/shared/PersonAvatar";
import AnimatedNumber from "@/components/shared/AnimatedNumber";
import { formatDate } from "@/components/shared/weekUtils";
import { cn } from "@/lib/utils";
import { soundCashOut, soundPaid } from "@/lib/useSound";

// ── Currency denomination layout ──────────────────────────────────────────────

const DENOMS = [
  { value: 100, label: "100", inkColor: "#0a2218", faceColor: "#a8dfc0", bgShine: "#c8f0d8", borderColor: "#1a7a44", isNote: true },
  { value: 50, label: "50", inkColor: "#0a1e30", faceColor: "#a0c8e8", bgShine: "#c0e0f8", borderColor: "#1a5a8a", isNote: true },
  { value: 20, label: "20", inkColor: "#0a2218", faceColor: "#a0e0b8", bgShine: "#c0f0d0", borderColor: "#147a3a", isNote: true },
  { value: 10, label: "10", inkColor: "#1a2a0a", faceColor: "#c8e898", bgShine: "#daf0b0", borderColor: "#3a6a10", isNote: true },
  { value: 5, label: "5", inkColor: "#0a2218", faceColor: "#a8e8c8", bgShine: "#c8f8e0", borderColor: "#1a7a44", isNote: true },
  { value: 1, label: "1", inkColor: "#0c2818", faceColor: "#b0e4c8", bgShine: "#d0f4e0", borderColor: "#1a6a38", isNote: true },
  { value: 0.25, label: "25¢", metalHigh: "#fff8e0", metalMid: "#f0c840", metalDark: "#b88000", isNote: false },
  { value: 0.10, label: "10¢", metalHigh: "#f8f4f0", metalMid: "#d8ccc8", metalDark: "#887878", isNote: false },
  { value: 0.05, label: "5¢", metalHigh: "#fff0e0", metalMid: "#e8a060", metalDark: "#904810", isNote: false },
  { value: 0.01, label: "1¢", metalHigh: "#ffe8d0", metalMid: "#e07840", metalDark: "#803010", isNote: false },
];

function breakIntoNotes(amount) {
  let remaining = Math.round(amount * 100) / 100;
  const result = [];
  for (const denom of DENOMS) {
    const count = Math.floor(remaining / denom.value + 0.0001);
    if (count > 0) {
      result.push({ ...denom, count });
      remaining = Math.round((remaining - count * denom.value) * 100) / 100;
    }
  }
  return result;
}

// Rich bill SVG with engraving details
function BillGraphic({ denom }) {
  const id = `bill-${denom.label}`;
  return (
    <svg width="80" height="40" viewBox="0 0 80 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="80" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={denom.bgShine} />
          <stop offset="50%" stopColor={denom.faceColor} />
          <stop offset="100%" stopColor={denom.faceColor} stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="0" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="white" stopOpacity="0.35" />
          <stop offset="50%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Drop shadow */}
      <rect x="2" y="3" width="78" height="37" rx="4" fill={denom.borderColor} opacity="0.25" />
      {/* Base fill */}
      <rect x="0.5" y="0.5" width="79" height="38" rx="3.5" fill={`url(#${id}-bg)`} stroke={denom.borderColor} strokeWidth="1.2" />
      {/* Shine overlay */}
      <rect x="0.5" y="0.5" width="79" height="38" rx="3.5" fill={`url(#${id}-shine)`} />
      {/* Inset border */}
      <rect x="3" y="3" width="74" height="34" rx="2.5" fill="none" stroke={denom.borderColor} strokeWidth="0.7" opacity="0.6" />
      {/* Left portrait oval */}
      <ellipse cx="14" cy="20" rx="8" ry="12" fill={denom.borderColor} opacity="0.08" />
      <ellipse cx="14" cy="20" rx="6" ry="10" fill="none" stroke={denom.borderColor} strokeWidth="0.8" opacity="0.5" />
      {/* Right serial oval */}
      <ellipse cx="66" cy="20" rx="8" ry="12" fill={denom.borderColor} opacity="0.08" />
      <ellipse cx="66" cy="20" rx="6" ry="10" fill="none" stroke={denom.borderColor} strokeWidth="0.8" opacity="0.5" />
      {/* Center guilloche pattern */}
      <ellipse cx="40" cy="20" rx="12" ry="12" fill="none" stroke={denom.borderColor} strokeWidth="0.5" opacity="0.2" />
      <ellipse cx="40" cy="20" rx="9" ry="9" fill="none" stroke={denom.borderColor} strokeWidth="0.5" opacity="0.25" />
      {/* Value text — large bold center */}
      <text x="40" y="24" textAnchor="middle" fontSize="15" fontWeight="900" fontFamily="Georgia, serif" fill={denom.inkColor} letterSpacing="-0.5">
        {denom.label}
      </text>
      {/* Corner denomination labels */}
      <text x="5" y="11" fontSize="6" fontWeight="700" fontFamily="serif" fill={denom.inkColor} opacity="0.7">{denom.label}</text>
      <text x="75" y="36" fontSize="6" fontWeight="700" fontFamily="serif" fill={denom.inkColor} opacity="0.7" textAnchor="end">{denom.label}</text>
      {/* Horizontal lines engraving */}
      {[27, 29, 31, 33].map(y => (
        <line key={y} x1="28" y1={y} x2="52" y2={y} stroke={denom.inkColor} strokeWidth="0.3" opacity="0.2" />
      ))}
    </svg>
  );
}

// Rich coin SVG with metallic depth
function CoinGraphic({ denom }) {
  const id = `coin-${denom.label.replace("¢", "")}`;
  return (
    <svg width="38" height="38" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`${id}-face`} cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor={denom.metalHigh} />
          <stop offset="45%" stopColor={denom.metalMid} />
          <stop offset="100%" stopColor={denom.metalDark} />
        </radialGradient>
        <radialGradient id={`${id}-rim`} cx="50%" cy="50%" r="50%">
          <stop offset="80%" stopColor="transparent" />
          <stop offset="100%" stopColor={denom.metalDark} stopOpacity="0.5" />
        </radialGradient>
      </defs>
      {/* Cast shadow */}
      <ellipse cx="19" cy="22" rx="15" ry="5" fill={denom.metalDark} opacity="0.2" />
      {/* Main disc */}
      <circle cx="19" cy="18" r="16" fill={`url(#${id}-face)`} />
      {/* Reeded edge */}
      {Array.from({ length: 24 }).map((_, i) => {
        const a = (i / 24) * Math.PI * 2;
        const x1 = 19 + 14.2 * Math.cos(a), y1 = 18 + 14.2 * Math.sin(a);
        const x2 = 19 + 16 * Math.cos(a), y2 = 18 + 16 * Math.sin(a);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={denom.metalDark} strokeWidth="1" opacity="0.5" />;
      })}
      {/* Outer rim */}
      <circle cx="19" cy="18" r="15" fill="none" stroke={denom.metalDark} strokeWidth="1.5" />
      {/* Inner field ring */}
      <circle cx="19" cy="18" r="11.5" fill="none" stroke={denom.metalDark} strokeWidth="0.6" opacity="0.4" />
      {/* Shine arc */}
      <path d={`M 10 10 A 10 10 0 0 1 24 8`} stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.5" fill="none" />
      {/* Value */}
      <text x="19" y="22" textAnchor="middle" fontSize="8" fontWeight="900" fontFamily="Arial, sans-serif" fill={denom.metalDark} letterSpacing="-0.3">
        {denom.label}
      </text>
    </svg>
  );
}

// A single flying bill/coin rendered as a fixed-position portal element
// Uses a 3-phase CSS transition: idle → pop → fall
function FlyingPiece({ denom, originRect, index, onDone }) {
  // "idle" | "pop" | "fall"
  const [phase, setPhase] = useState("idle");

  const rand = useRef({
    popHeight: 90 + Math.random() * 200,
    popX: (Math.random() - 0.5) * 60,
    fallX: (Math.random() - 0.5) * 320,
    rotate: denom.isNote
      ? (Math.random() - 0.5) * 420
      : (Math.random() - 0.5) * 720,
    delay: index * 80 + Math.random() * 50,
  }).current;

  const startX = originRect.left + originRect.width / 2 - (denom.isNote ? 40 : 19);
  const startY = originRect.top + originRect.height / 2 - (denom.isNote ? 20 : 19);
  const fallY = window.innerHeight + 120;

  useEffect(() => {
    // idle → pop after stagger delay
    const t1 = setTimeout(() => setPhase("pop"), rand.delay);
    // pop → fall after pop duration (500ms smooth pop)
    const t2 = setTimeout(() => setPhase("fall"), rand.delay + 500);
    // call onDone after fall completes (1.4s smooth fall)
    const t3 = setTimeout(() => onDone?.(), rand.delay + 1900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const styles = {
    idle: {
      transform: "translate(0px, 0px) rotate(0deg) scale(0.5)",
      opacity: 0,
      transition: "none",
    },
    pop: {
      transform: `translate(${rand.popX}px, ${-rand.popHeight}px) rotate(${rand.rotate * 0.2}deg) scale(1.15)`,
      opacity: 1,
      transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.15s ease-out",
    },
    fall: {
      transform: `translate(${rand.fallX}px, ${fallY}px) rotate(${rand.rotate}deg) scale(0.75)`,
      opacity: 0,
      transition: "transform 1.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.5s 0.7s ease-in",
    },
  };

  return createPortal(
    <div
      style={{
        position: "fixed",
        left: startX,
        top: startY,
        zIndex: 9999,
        pointerEvents: "none",
        willChange: "transform, opacity",
        ...styles[phase],
      }}
    >
      {denom.isNote ? <BillGraphic denom={denom} /> : <CoinGraphic denom={denom} />}
    </div>,
    document.body
  );
}

// Denomination breakdown table showing running total
function DenomBreakdown({ pieces, total }) {
  let running = 0;
  const rows = pieces.map(denom => {
    running = Math.round((running + denom.count * denom.value) * 100) / 100;
    return { ...denom, subtotal: denom.count * denom.value, running };
  });

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground pb-1 border-b border-border/50">
        <span>Denomination</span>
        <div className="flex gap-6">
          <span className="w-12 text-right">Qty</span>
          <span className="w-16 text-right">Subtotal</span>
          <span className="w-16 text-right">Running</span>
        </div>
      </div>
      {rows.map((row, i) => (
        <motion.div
          key={row.value}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04, type: "spring", stiffness: 280, damping: 22 }}
          className="flex items-center justify-between py-0.5"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 shrink-0">
              {row.isNote ? <BillGraphic denom={row} /> : <CoinGraphic denom={row} />}
            </div>
            <span className="text-xs font-semibold text-foreground">${row.label}</span>
          </div>
          <div className="flex gap-6 text-xs tabular-nums">
            <span className="w-12 text-right text-muted-foreground">×{row.count}</span>
            <span className="w-16 text-right font-medium text-foreground">${row.subtotal.toFixed(2)}</span>
            <span className="w-16 text-right font-bold" style={{ color: "hsl(var(--chart-2))" }}>${row.running.toFixed(2)}</span>
          </div>
        </motion.div>
      ))}
      <div className="flex items-center justify-between pt-1.5 border-t border-border mt-1">
        <span className="text-xs font-black text-foreground">Total</span>
        <span className="text-sm font-black text-foreground tabular-nums">${total.toFixed(2)}</span>
      </div>
    </div>
  );
}

// Cash-out overlay: captures the container rect once, fires all flying pieces
function CashOutBurst({ pieces, containerRef, onDone }) {
  const rect = useMemo(
    () => containerRef.current?.getBoundingClientRect() ?? { left: 200, top: 200, width: 60, height: 40 },
    []
  );
  // Compute worst-case finish time: last piece delay + pop + fall
  const lastDelay = pieces.length * 80 + 50 + 350 + 1050 + 100;
  useEffect(() => {
    const t = setTimeout(onDone, lastDelay);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      {pieces.map((denom, i) => (
        <FlyingPiece key={`${denom.value}-${i}`} denom={denom} index={i} originRect={rect} />
      ))}
    </>
  );
}

// Money wallet card for a single kid
function KidWallet({ person, personIndex, available, pending, paying, onCashOut, isCashingOutId, burstPieces, onBurstDone }) {
  const displayPieces = useMemo(() => breakIntoNotes(available), [available]);
  const hasPending = pending > 0;
  const containerRef = useRef(null);

  const pipeColors = ["#6366f1", "#f59e0b", "#ec4899", "#06b6d4", "#8b5cf6", "#10b981"];
  const accent = pipeColors[personIndex % pipeColors.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: personIndex * 0.12, type: "spring", stiffness: 160, damping: 18 }}
    >
      {/* Portal burst — fires flying pieces over the full screen */}
      {paying && burstPieces && (
        <CashOutBurst pieces={burstPieces} containerRef={containerRef} onDone={onBurstDone} />
      )}

      <Card className="overflow-hidden" style={{ borderColor: `${accent}44` }}>
        {/* Header strip */}
        <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${accent}, ${accent}88)` }} />
        <CardContent className="p-5 space-y-4">
          {/* Person row */}
          <div className="flex items-center gap-3">
            <PersonAvatar name={person.name} avatarColor={person.avatar_color} colorIndex={personIndex} size="md" />
            <div className="flex-1 min-w-0">
              <div className="font-black text-foreground font-nunito text-base">{person.name}</div>
              <div className="text-xs text-muted-foreground">Available balance</div>
            </div>
            <AnimatedNumber
              value={available}
              className="text-2xl font-black"
              style={{ color: accent }}
              prefix="$"
              decimals={2}
            />
          </div>

          {/* Denomination breakdown */}
          <div ref={containerRef} className="rounded-xl bg-secondary/60 border border-border p-3 overflow-hidden">
            {displayPieces.length === 0 ? (
              <div className="flex items-center justify-center h-12 text-xs text-muted-foreground">
                No earnings yet — complete chores to fill up!
              </div>
            ) : (
              <DenomBreakdown pieces={displayPieces} total={available} />
            )}
          </div>

          {/* Cash out / pending */}
          <AnimatePresence mode="wait">
            {hasPending ? (
              <motion.div
                key="pending"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                className="flex items-center gap-2 justify-center py-2 rounded-xl bg-amber-500/10 border border-amber-400/30"
              >
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-bold text-amber-600">${pending.toFixed(2)} pending approval</span>
              </motion.div>
            ) : (
              <motion.div
                key="cashout"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                whileHover={{ scale: available > 0 ? 1.02 : 1 }}
                whileTap={{ scale: available > 0 ? 0.97 : 1 }}
              >
                <Button
                  className={cn("w-full h-10 font-bold rounded-xl gap-2 text-sm", available > 0 ? "text-white shadow-lg" : "")}
                  style={available > 0 ? { background: `linear-gradient(135deg, ${accent}, ${accent}bb)`, boxShadow: `0 4px 16px ${accent}44` } : {}}
                  variant={available > 0 ? "default" : "outline"}
                  disabled={available <= 0 || !!isCashingOutId}
                  onClick={() => onCashOut(person, available)}
                >
                  <Coins className="w-4 h-4" />
                  {available > 0 ? `Cash Out $${available.toFixed(2)}` : "Nothing to cash out"}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Parent card — different look ──────────────────────────────────────────────

function PayoutRow({ payout, child, onMarkPaid, isMarkingPaid, index }) {
  const [paid, setPaid] = useState(false);

  const handlePay = () => {
    setPaid(true);
    // Small visual delay so the check animation plays before row exit
    setTimeout(() => onMarkPaid(payout), 400);
  };

  return (
    <AnimatePresence>
      {!paid && (
        <motion.div
          key={payout.id}
          initial={{ opacity: 0, x: -14, height: 0 }}
          animate={{ opacity: 1, x: 0, height: "auto" }}
          exit={{ opacity: 0, x: 14, height: 0, marginBottom: 0 }}
          transition={{ delay: index * 0.06, type: "spring", stiffness: 240, damping: 22 }}
          className="flex items-center gap-2 p-2.5 rounded-xl bg-card border overflow-hidden"
        >
          <PersonAvatar name={child.name} avatarColor={child.avatar_color} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-foreground">{child.name}</div>
            <div className="text-[10px] text-muted-foreground">{payout.requested_date}</div>
          </div>
          <motion.div
            key={payout.amount}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="font-black text-sm text-foreground tabular-nums"
          >
            ${payout.amount.toFixed(2)}
          </motion.div>
          <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.88 }}>
            <Button
              size="sm"
              className="h-7 px-3 text-xs rounded-lg gap-1 bg-emerald-500 hover:bg-emerald-600 text-white border-0 shadow-sm shadow-emerald-500/30"
              onClick={handlePay}
              disabled={isMarkingPaid}
            >
              <CheckCircle2 className="w-3 h-3" /> Pay
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ParentCard({ person, personIndex, pendingPayouts, onMarkPaid, isMarkingPaid, allPeople }) {
  const myPending = pendingPayouts.filter(p => {
    const child = allPeople.find(x => x.id === p.profile_id);
    return child && !child.is_parent;
  });
  const totalPending = myPending.reduce((s, p) => s + p.amount, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: personIndex * 0.1, type: "spring", stiffness: 200, damping: 22 }}
    >
      <Card className="relative overflow-hidden border-2 border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-indigo-500/5">
        {/* Crown watermark */}
        <div className="absolute top-3 right-4 text-4xl opacity-10 select-none pointer-events-none">👑</div>

        <CardContent className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <PersonAvatar name={person.name} avatarColor={person.avatar_color} colorIndex={personIndex} size="lg" />
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 400 }}
                className="absolute -bottom-1 -right-1 w-5 h-5 bg-violet-500 rounded-full flex items-center justify-center shadow"
              >
                <ShieldCheck className="w-3 h-3 text-white" />
              </motion.div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-black text-foreground font-nunito text-base flex items-center gap-2">
                {person.name}
                <Badge className="bg-violet-500/15 text-violet-600 border-violet-500/30 text-[10px] font-bold">Parent</Badge>
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={myPending.length}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="text-xs text-muted-foreground mt-0.5"
                >
                  {myPending.length > 0
                    ? `${myPending.length} payout${myPending.length !== 1 ? "s" : ""} awaiting approval`
                    : "No pending requests"}
                </motion.div>
              </AnimatePresence>
            </div>
            {/* Animated total badge */}
            <AnimatePresence>
              {totalPending > 0 && (
                <motion.div
                  key={totalPending}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 380, damping: 18 }}
                  className="shrink-0 text-sm font-black text-violet-600 bg-violet-500/10 px-2.5 py-1 rounded-lg"
                >
                  ${totalPending.toFixed(2)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Pending approval list */}
          <AnimatePresence>
            {myPending.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-[10px] font-bold uppercase tracking-widest text-violet-500"
                >
                  Pending Approvals
                </motion.div>
                {myPending.map((payout, i) => {
                  const child = allPeople.find(x => x.id === payout.profile_id);
                  if (!child) return null;
                  return (
                    <PayoutRow
                      key={payout.id}
                      payout={payout}
                      child={child}
                      index={i}
                      onMarkPaid={onMarkPaid}
                      isMarkingPaid={isMarkingPaid}
                    />
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {myPending.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="flex items-center gap-2 py-3 rounded-xl bg-emerald-500/10 border border-emerald-400/30 px-3"
              >
                <motion.div
                  animate={{ rotate: [0, 15, -5, 0] }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </motion.div>
                <span className="text-xs font-semibold text-emerald-600">All caught up! No pending requests.</span>
              </motion.div>
            )}
          </AnimatePresence>

          {person.max_single_payout && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <AlertCircle className="w-3 h-3 shrink-0" />
              Max single payout: ${person.max_single_payout}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}



// ── Stats bar ──────────────────────────────────────────────────────────────────

function StatsBar({ kids, streakMap, payouts }) {
  const totalEarned = kids.reduce((s, p) => s + (streakMap[p.id]?.total_rewards_earned || 0), 0);
  const totalPaid = payouts.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const totalPending = payouts.filter(p => p.status === "pending").reduce((s, p) => s + p.amount, 0);
  const totalAvailable = Math.max(0, totalEarned - totalPaid - totalPending);

  const stats = [
    { label: "Total Earned", amount: totalEarned, icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
    { label: "Paid Out", amount: totalPaid, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Pending", amount: totalPending, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Available", amount: totalAvailable, icon: Coins, color: "text-violet-500", bg: "bg-violet-500/10" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((s, i) => (
        <motion.div key={s.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07, type: "spring", stiffness: 220 }}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
        >
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", s.bg)}>
                <s.icon className={cn("w-4 h-4", s.color)} />
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">{s.label}</div>
                <AnimatedNumber value={s.amount} className="text-lg font-black text-foreground" prefix="$" decimals={2} />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function Bank() {
  const queryClient = useQueryClient();
  const [cashingOutId, setCashingOutId] = useState(null);
  // burstState: { personId, pieces } | null
  const [burstState, setBurstState] = useState(null);

  const { data: people = [] } = useQuery({ queryKey: ["people"], queryFn: () => entities.Profile.list() });
  const { data: streaks = [] } = useQuery({ queryKey: ["streaks"], queryFn: () => entities.Streak.list(), refetchInterval: 1000 });
  const { data: payouts = [] } = useQuery({ queryKey: ["payouts"], queryFn: () => entities.Payout.list(), refetchInterval: 1000 });

  const createPayoutMutation = useMutation({
    mutationFn: (data) => entities.Payout.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payouts"] }),
  });
  const updatePayoutMutation = useMutation({
    mutationFn: ({ id, data }) => entities.Payout.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payouts"] }),
  });

  const activePeople = people.filter(p => p.active !== false);
  const kids = activePeople.filter(p => !p.is_parent);
  const parents = activePeople.filter(p => p.is_parent);
  const streakMap = useMemo(() => Object.fromEntries(streaks.map(s => [s.profile_id, s])), [streaks]);

  const getKidFinancials = (person) => {
    const earned = streakMap[person.id]?.total_rewards_earned || 0;
    const paid = payouts.filter(p => p.profile_id === person.id && p.status === "paid").reduce((s, p) => s + p.amount, 0);
    const pending = payouts.filter(p => p.profile_id === person.id && p.status === "pending").reduce((s, p) => s + p.amount, 0);
    const available = Math.max(0, earned - paid - pending);
    return { earned, paid, pending, available };
  };

  const handleCashOut = async (person, amount) => {
    soundCashOut();
    setCashingOutId(person.id);
    // Capture the pieces to burst BEFORE the payout is created (balance will change)
    const pieces = breakIntoNotes(amount);
    setBurstState({ personId: person.id, pieces });
    await createPayoutMutation.mutateAsync({
      profile_id: person.id, amount, status: "pending",
      requested_date: formatDate(new Date()),
    });
  };

  const handleBurstDone = () => {
    setBurstState(null);
    setCashingOutId(null);
  };

  const handleMarkPaid = async (payout) => {
    soundPaid();
    await updatePayoutMutation.mutateAsync({ id: payout.id, data: { status: "paid", paid_date: formatDate(new Date()) } });
  };

  const pendingPayouts = payouts.filter(p => p.status === "pending");

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="relative -mx-4 md:-mx-8 -mt-4 md:-mt-8 px-4 md:px-8 pt-8 md:pt-10 pb-6 overflow-visible"
          style={{ background: "linear-gradient(135deg, #f59e0b28 0%, #f59e0b10 60%, transparent 100%)" }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 15% 50%, #f59e0b1e 0%, transparent 65%)" }} />
          <div className="relative">
            <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3 font-nunito">
              <motion.span animate={{ y: [0, -5, 0], rotate: [0, 8, 0] }} transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.5 }}>💰</motion.span>
              Money Bank
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Bills & coins — earn from chore payouts, check-in streaks, and weekly allowances</p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      {kids.length > 0 && <StatsBar kids={kids} streakMap={streakMap} payouts={payouts} />}

      {/* Kids wallets */}
      {kids.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {kids.map((person, i) => {
            const { available, pending } = getKidFinancials(person);
            return (
              <KidWallet
                key={person.id}
                person={person}
                personIndex={i}
                available={available}
                pending={pending}
                paying={burstState?.personId === person.id}
                burstPieces={burstState?.personId === person.id ? burstState.pieces : null}
                onBurstDone={handleBurstDone}
                onCashOut={handleCashOut}
                isCashingOutId={cashingOutId}
              />
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-16 text-center text-muted-foreground">
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2.5, repeat: Infinity }} className="text-4xl mb-3">🪙</motion.div>
            <p className="text-sm">Add kids and start earning to see their wallets.</p>
          </CardContent>
        </Card>
      )}

      {/* Parents */}
      {parents.length > 0 && (
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5" /> Parent Accounts
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {parents.map((person, i) => (
              <ParentCard
                key={person.id}
                person={person}
                personIndex={i}
                pendingPayouts={pendingPayouts}
                onMarkPaid={handleMarkPaid}
                isMarkingPaid={updatePayoutMutation.isPending}
                allPeople={activePeople}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
