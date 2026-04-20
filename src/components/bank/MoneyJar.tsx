import { useEffect, useRef, useState } from "react";
import { motion, useAnimation, AnimatePresence } from "framer-motion";

// Floating sparkle
function Sparkle({ x, y, delay }: { x: string; y: string; delay: number }) {
  return (
    <motion.div
      className="absolute pointer-events-none select-none text-yellow-300"
      style={{ left: x, top: y, fontSize: 12 }}
      initial={{ opacity: 0, scale: 0, y: 0 }}
      animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0], y: -24 }}
      transition={{ duration: 1.6, delay, repeat: Infinity, repeatDelay: 3 + Math.random() * 4 }}
    >
      ✦
    </motion.div>
  );
}

// Coin flying up on payout
function PayoutCoin({ i, total, onDone }: { i: number; total: number; onDone: () => void }) {
  const angle = (i / total) * Math.PI * 2;
  const dist = 60 + Math.random() * 40;
  const tx = Math.cos(angle) * dist;
  const ty = -(80 + Math.random() * 60);
  const EMOJIS = ["🪙", "💰", "✨", "⭐", "💸"];
  const emoji = EMOJIS[i % EMOJIS.length];

  return (
    <motion.div
      className="absolute pointer-events-none select-none text-2xl"
      style={{ left: "50%", top: "40%", x: "-50%", y: "-50%", zIndex: 50 }}
      initial={{ opacity: 1, x: "-50%", y: "-50%", scale: 0.5, rotate: 0 }}
      animate={{
        opacity: [1, 1, 0],
        x: `calc(-50% + ${tx}px)`,
        y: `calc(-50% + ${ty}px)`,
        scale: [0.5, 1.4, 0.8],
        rotate: [0, (Math.random() - 0.5) * 360],
      }}
      transition={{ duration: 1.1, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
      onAnimationComplete={i === 0 ? onDone : undefined}
    >
      {emoji}
    </motion.div>
  );
}

interface MoneyJarProps {
  fillPercent?: number;
  amount?: number;
  paying?: boolean;
}

export default function MoneyJar({ fillPercent = 0, amount = 0, paying = false }: MoneyJarProps) {
  const clampedFill = Math.min(100, Math.max(0, fillPercent));
  const fillHeight = Math.round((clampedFill / 100) * 84);
  const fillY = 130 - fillHeight - 14;
  const jarControls = useAnimation();
  const waveControls = useAnimation();
  const [showPayout, setShowPayout] = useState(false);
  const prevPaying = useRef(false);

  // Idle wave animation
  useEffect(() => {
    if (clampedFill <= 0) return;
    const loop = async () => {
      while (true) {
        await waveControls.start({
          d: `M16 ${fillY + 8} Q30 ${fillY + 2} 50 ${fillY + 8} Q70 ${fillY + 14} 84 ${fillY + 8}`,
          transition: { duration: 2.2, ease: "easeInOut" },
        });
        await waveControls.start({
          d: `M16 ${fillY + 10} Q35 ${fillY + 16} 50 ${fillY + 10} Q65 ${fillY + 4} 84 ${fillY + 10}`,
          transition: { duration: 2.2, ease: "easeInOut" },
        });
      }
    };
    loop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clampedFill, fillY]);

  // Payout burst
  useEffect(() => {
    if (paying && !prevPaying.current) {
      setShowPayout(true);
      // Shake the jar
      jarControls.start({
        rotate: [0, -6, 8, -8, 6, -4, 3, 0],
        scale: [1, 1.06, 1.04, 1.06, 1.03, 1],
        transition: { duration: 0.7 },
      });
    }
    prevPaying.current = paying;
  }, [paying, jarControls]);

  // Lid gradient colors based on fill
  const lidColor = clampedFill > 60 ? "#d97706" : clampedFill > 30 ? "#9333ea" : "#6d5bd0";
  const lidHighlight = clampedFill > 60 ? "#f59e0b" : clampedFill > 30 ? "#a855f7" : "#8b7fe0";

  // Gold liquid color shifts with fill
  const liquidColor = clampedFill > 75 ? "#f59e0b" : clampedFill > 40 ? "#fbbf24" : "#fcd34d";
  const liquidDark = clampedFill > 75 ? "#d97706" : clampedFill > 40 ? "#f59e0b" : "#fbbf24";

  return (
    <div className="flex flex-col items-center gap-3 select-none relative">
      {/* Ambient idle sparkles */}
      {clampedFill > 20 && [
        { x: "12%", y: "15%", delay: 0 },
        { x: "78%", y: "22%", delay: 1.2 },
        { x: "20%", y: "60%", delay: 2.5 },
        { x: "72%", y: "55%", delay: 0.7 },
      ].map((s, i) => <Sparkle key={i} {...s} />)}

      {/* Payout coins */}
      <AnimatePresence>
        {showPayout && Array.from({ length: 12 }).map((_, i) => (
          <PayoutCoin key={i} i={i} total={12} onDone={() => setShowPayout(false)} />
        ))}
      </AnimatePresence>

      <motion.div animate={jarControls} style={{ originY: 0.8 }}>
        <svg width="130" height="168" viewBox="0 0 130 168" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <clipPath id="jar-clip-grand">
              <path d="M24 36 Q18 62 18 98 Q18 148 65 152 Q112 148 112 98 Q112 62 106 36 Z" />
            </clipPath>
            <linearGradient id="jar-body-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#e2eaf8" />
              <stop offset="35%" stopColor="#f8faff" />
              <stop offset="70%" stopColor="#f0f4fc" />
              <stop offset="100%" stopColor="#dce6f5" />
            </linearGradient>
            <linearGradient id="liquid-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={liquidColor} />
              <stop offset="100%" stopColor={liquidDark} />
            </linearGradient>
            <linearGradient id="lid-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lidHighlight} />
              <stop offset="100%" stopColor={lidColor} />
            </linearGradient>
            <filter id="jar-glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <radialGradient id="bottom-shadow" cx="50%" cy="100%" r="50%">
              <stop offset="0%" stopColor="rgba(0,0,0,0.12)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </radialGradient>
          </defs>

          {/* Drop shadow */}
          <ellipse cx="65" cy="162" rx="38" ry="6" fill="rgba(0,0,0,0.10)" />

          {/* Jar body glass */}
          <path
            d="M24 36 Q18 62 18 98 Q18 148 65 152 Q112 148 112 98 Q112 62 106 36 Z"
            fill="url(#jar-body-grad)"
            stroke="#c7d6f0"
            strokeWidth="1.5"
          />

          {/* Liquid fill */}
          {clampedFill > 0 && (
            <>
              <motion.rect
                clipPath="url(#jar-clip-grand)"
                x="18" width="94"
                initial={{ y: 152, height: 0 }}
                animate={{ y: fillY, height: fillHeight + 26 }}
                transition={{ duration: 1.4, type: "spring", stiffness: 55, damping: 14 }}
                fill="url(#liquid-grad)"
                opacity="0.92"
              />
              {/* Animated wave surface */}
              <motion.path
                clipPath="url(#jar-clip-grand)"
                animate={waveControls}
                initial={{ d: `M18 ${fillY + 9} Q42 ${fillY + 9} 65 ${fillY + 9} Q89 ${fillY + 9} 112 ${fillY + 9}` }}
                fill={liquidColor}
                opacity="0.55"
              />
              {/* Foam/bubble effect at surface */}
              {clampedFill > 15 && (
                <motion.ellipse
                  clipPath="url(#jar-clip-grand)"
                  cx="65" cy={fillY + 6}
                  animate={{ ry: [2, 4, 2], opacity: [0.3, 0.5, 0.3] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                  rx="30" ry="3" fill="white" opacity="0.4"
                />
              )}
              {/* Coin stack at bottom */}
              {clampedFill >= 25 && (
                <>
                  <motion.ellipse
                    clipPath="url(#jar-clip-grand)"
                    cx="65" cy="140" rx="22" ry="5"
                    initial={{ opacity: 0 }} animate={{ opacity: 0.9 }}
                    transition={{ delay: 0.8 }}
                    fill="#d97706"
                  />
                  <motion.ellipse
                    clipPath="url(#jar-clip-grand)"
                    cx="65" cy="137" rx="22" ry="5"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: 0.85 }}
                    fill="#f59e0b"
                  />
                  <motion.ellipse
                    clipPath="url(#jar-clip-grand)"
                    cx="65" cy="134" rx="22" ry="5"
                    initial={{ opacity: 0 }} animate={{ opacity: 0.85 }}
                    transition={{ delay: 0.9 }}
                    fill="#fbbf24"
                  />
                </>
              )}
              {clampedFill >= 60 && (
                <>
                  <motion.ellipse clipPath="url(#jar-clip-grand)" cx="65" cy="124" rx="20" ry="4"
                    initial={{ opacity: 0 }} animate={{ opacity: 0.9 }} transition={{ delay: 1 }} fill="#d97706" />
                  <motion.ellipse clipPath="url(#jar-clip-grand)" cx="65" cy="121" rx="20" ry="4"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.05 }} fill="#fbbf24" />
                </>
              )}
            </>
          )}

          {/* Jar glass outline (front) */}
          <path
            d="M24 36 Q18 62 18 98 Q18 148 65 152 Q112 148 112 98 Q112 62 106 36 Z"
            fill="none"
            stroke="#b8cce8"
            strokeWidth="2"
          />

          {/* Inner glass sheen left */}
          <motion.ellipse
            cx="36" cy="82"
            animate={{ opacity: [0.25, 0.4, 0.25] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            rx="6" ry="22"
            fill="white"
            opacity="0.3"
            transform="rotate(-18 36 82)"
          />
          {/* Inner glass sheen top */}
          <ellipse cx="58" cy="46" rx="18" ry="5" fill="white" opacity="0.18" transform="rotate(-8 58 46)" />

          {/* Neck of jar */}
          <path d="M38 36 Q32 28 36 22 L94 22 Q98 28 92 36 Z" fill="url(#jar-body-grad)" stroke="#c7d6f0" strokeWidth="1.5" />

          {/* Lid base ring */}
          <rect x="32" y="18" width="66" height="8" rx="4" fill={lidColor} opacity="0.4" />
          {/* Lid main */}
          <rect x="28" y="10" width="74" height="16" rx="6" fill="url(#lid-grad)" />
          {/* Lid shine */}
          <rect x="34" y="12" width="48" height="4" rx="2" fill="white" opacity="0.3" />
          {/* Lid knob */}
          <rect x="50" y="4" width="30" height="10" rx="5" fill={lidHighlight} />
          <rect x="57" y="5.5" width="16" height="4" rx="2" fill="white" opacity="0.35" />

          {/* Shine overlay on jar */}
          <path
            d="M24 36 Q18 62 18 98 Q18 148 65 152 Q112 148 112 98 Q112 62 106 36 Z"
            fill="url(#bottom-shadow)"
          />

          {/* Label area */}
          <motion.rect
            x="34" y="88" width="62" height="30" rx="8"
            fill="white" opacity="0.22"
            animate={{ opacity: [0.18, 0.28, 0.18] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          {clampedFill === 0 && (
            <text x="65" y="107" textAnchor="middle" fontSize="11" fill="#94a3b8" fontWeight="600" opacity="0.7">EMPTY</text>
          )}
          {clampedFill > 0 && clampedFill < 40 && (
            <text x="65" y="107" textAnchor="middle" fontSize="9" fill="#92400e" fontWeight="700" opacity="0.8">SAVING</text>
          )}
          {clampedFill >= 40 && (
            <text x="65" y="107" textAnchor="middle" fontSize="9" fill="#78350f" fontWeight="800" opacity="0.9">JACKPOT</text>
          )}
        </svg>
      </motion.div>

      {/* Amount */}
      <motion.div
        key={amount}
        initial={{ scale: 0.6, opacity: 0, y: 6 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 20 }}
        className="text-3xl font-black tabular-nums tracking-tight"
        style={{
          background: amount > 0
            ? "linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #fbbf24 100%)"
            : undefined,
          WebkitBackgroundClip: amount > 0 ? "text" : undefined,
          WebkitTextFillColor: amount > 0 ? "transparent" : undefined,
          color: amount === 0 ? "hsl(var(--muted-foreground))" : undefined,
        }}
      >
        ${amount.toFixed(2)}
      </motion.div>
      <div className="text-xs text-muted-foreground font-semibold tracking-wide uppercase">available</div>
    </div>
  );
}