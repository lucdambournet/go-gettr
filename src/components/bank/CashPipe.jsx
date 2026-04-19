import { useEffect, useState } from "react";
import { motion, AnimatePresence, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

// Animated bill that flies out during payout dump
function FlyingBill({ delay, angle, distance, onDone }) {
  return (
    <motion.div
      className="absolute top-2 left-1/2 pointer-events-none z-30 text-lg select-none"
      initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
      animate={{
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance - 60,
        opacity: 0,
        rotate: (Math.random() - 0.5) * 360,
        scale: 0.4,
      }}
      transition={{ delay, duration: 0.9 + Math.random() * 0.4, ease: "easeOut" }}
      onAnimationComplete={onDone}
    >
      💵
    </motion.div>
  );
}

// Shimmer ripple on the liquid surface
function LiquidShimmer() {
  return (
    <motion.div
      className="absolute inset-x-0 top-0 h-3 rounded-t-full"
      style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.45) 50%, transparent 100%)" }}
      animate={{ x: ["-100%", "120%"] }}
      transition={{ duration: 2.2, repeat: Infinity, ease: "linear", repeatDelay: 1.1 }}
    />
  );
}

// Bubble rising through the liquid
function Bubble({ delay }) {
  const size = 4 + Math.random() * 5;
  const x = 10 + Math.random() * 80; // % from left
  return (
    <motion.div
      className="absolute rounded-full border border-white/30"
      style={{
        width: size, height: size,
        left: `${x}%`,
        bottom: 4,
        background: "rgba(255,255,255,0.18)",
      }}
      animate={{ y: [0, -(40 + Math.random() * 40)], opacity: [0.7, 0] }}
      transition={{ delay, duration: 1.4 + Math.random() * 0.8, repeat: Infinity, repeatDelay: 0.5 + Math.random() * 2, ease: "easeOut" }}
    />
  );
}

export default function CashPipe({ person, personIndex, fillPercent, amount, name, paying, onPayAnimDone }) {
  const PIPE_H = 280;
  const fillH = Math.max(0, Math.min(100, fillPercent));

  const springFill = useSpring(fillH, { stiffness: 30, damping: 12 });
  const liquidHeight = useTransform(springFill, v => `${v}%`);

  useEffect(() => { springFill.set(fillH); }, [fillH]);

  const [bills, setBills] = useState([]);

  useEffect(() => {
    if (paying) {
      const count = 14;
      const newBills = Array.from({ length: count }, (_, i) => ({
        id: Date.now() + i,
        delay: i * 0.045,
        angle: (Math.PI * 2 * i) / count + Math.random() * 0.4,
        distance: 60 + Math.random() * 80,
      }));
      setBills(newBills);
    }
  }, [paying]);

  // Gradient based on fill level
  const liquidGrad = fillH > 60
    ? "linear-gradient(180deg, #4ade80 0%, #22c55e 40%, #16a34a 100%)"
    : fillH > 25
    ? "linear-gradient(180deg, #86efac 0%, #4ade80 40%, #22c55e 100%)"
    : "linear-gradient(180deg, #bbf7d0 0%, #86efac 50%, #4ade80 100%)";

  // Label
  const label = fillH >= 85 ? "FULL" : fillH >= 40 ? "GROWING" : fillH > 0 ? "SAVING" : "EMPTY";
  const labelColor = fillH >= 85 ? "text-emerald-300" : fillH > 0 ? "text-emerald-400" : "text-muted-foreground";

  const pipeColors = [
    "#6366f1", "#f59e0b", "#ec4899", "#06b6d4", "#8b5cf6", "#10b981"
  ];
  const pipeColor = pipeColors[personIndex % pipeColors.length];

  return (
    <div className="flex flex-col items-center gap-3 select-none" style={{ minWidth: 80 }}>
      {/* Amount badge */}
      <motion.div
        key={amount.toFixed(2)}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300 }}
        className="text-xl font-black text-foreground tabular-nums"
      >
        ${amount.toFixed(2)}
      </motion.div>

      {/* Pipe structure */}
      <div className="relative" style={{ height: PIPE_H, width: 64 }}>
        {/* Payout flying bills */}
        <AnimatePresence>
          {bills.map(b => (
            <FlyingBill key={b.id} delay={b.delay} angle={b.angle} distance={b.distance}
              onDone={() => setBills(prev => prev.filter(x => x.id !== b.id))} />
          ))}
        </AnimatePresence>

        {/* Pipe outer shell */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden border-2"
          style={{
            borderColor: pipeColor + "66",
            background: "hsl(var(--secondary))",
            boxShadow: `inset 0 0 20px rgba(0,0,0,0.08), 0 4px 24px ${pipeColor}22`,
          }}
        >
          {/* Pipe left sheen */}
          <div className="absolute inset-y-0 left-1.5 w-2 rounded-full opacity-20"
            style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.9) 0%, transparent 100%)" }} />

          {/* Liquid fill */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 rounded-b-2xl overflow-hidden"
            style={{ height: liquidHeight }}
          >
            {/* Liquid gradient */}
            <div className="absolute inset-0" style={{ background: liquidGrad, opacity: paying ? 0.4 : 1 }} />

            {/* Shimmer */}
            <div className="absolute inset-0 overflow-hidden">
              <LiquidShimmer />
            </div>

            {/* Bubbles */}
            {fillH > 5 && [0.3, 1.1, 2.0, 0.8, 1.7].map((d, i) => (
              <Bubble key={i} delay={d} />
            ))}

            {/* Foam top */}
            <div className="absolute top-0 left-0 right-0 h-2 rounded-t-full opacity-40"
              style={{ background: "rgba(255,255,255,0.6)" }} />
          </motion.div>

          {/* Amount text inside pipe when has value */}
          {fillH > 15 && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center">
              <span className="text-[10px] font-black text-white/80 tabular-nums drop-shadow">{fillH.toFixed(0)}%</span>
            </div>
          )}

          {/* Drip animation when paying */}
          {paying && (
            <motion.div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-8 rounded-b-full"
              style={{ background: liquidGrad }}
              animate={{ scaleY: [0, 1, 0], y: [0, 16, 32] }}
              transition={{ duration: 0.4, repeat: 3, ease: "easeIn" }}
            />
          )}
        </div>

        {/* Pipe top cap */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-10 h-3 rounded-t-xl border-t-2 border-x-2"
          style={{ borderColor: pipeColor + "88", background: pipeColor + "22" }} />

        {/* Connector spigot at bottom */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-4 rounded-b-lg"
          style={{ background: pipeColor + "55", border: `1px solid ${pipeColor}88` }} />
      </div>

      {/* Label */}
      <div className="flex flex-col items-center gap-1">
        <span className={cn("text-[10px] font-black uppercase tracking-widest", labelColor)}>{label}</span>
        <div className="font-semibold text-sm text-foreground text-center leading-tight max-w-[72px] truncate">{name}</div>
      </div>
    </div>
  );
}