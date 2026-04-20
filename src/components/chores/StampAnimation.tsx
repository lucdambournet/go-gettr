import { motion } from "framer-motion";

interface StampAnimationProps { cardRect: DOMRect | null; }

export default function StampAnimation({ cardRect }: StampAnimationProps) {
  if (!cardRect) return null;

  const cx = cardRect.left + cardRect.width / 2;
  const cy = cardRect.top + cardRect.height / 2;

  const corners = [[3,3],[157,3],[3,69],[157,69]];

  return (
    <motion.div
      className="fixed pointer-events-none z-50"
      style={{ left: cx, top: cy, transform: "translate(-50%, -50%)" }}
    >
      {/* Main stamp */}
      <motion.div
        initial={{ scale: 2.2, rotate: -12, opacity: 0 }}
        animate={{
          scale: 1,
          rotate: -8,
          opacity: 1,
          transition: { type: "spring", stiffness: 300, damping: 18, mass: 0.6 },
        }}
        exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
      >
        {/* Ink glow */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.05, duration: 0.15 } }}
          className="absolute inset-0 pointer-events-none"
          style={{ boxShadow: "0 0 18px 6px rgba(239,68,68,0.25)", borderRadius: 8 }}
        />

        <svg width="160" height="72" viewBox="0 0 160 72" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Outer border */}
          <rect x="3" y="3" width="154" height="66" rx="6" fill="rgba(239,68,68,0.07)" stroke="#ef4444" strokeWidth="3.5" opacity="0.92" />
          {/* Inner border */}
          <rect x="8" y="8" width="144" height="56" rx="4" fill="none" stroke="#dc2626" strokeWidth="1.2" opacity="0.5" />

          {/* Corner serifs */}
          {corners.map(([x, y], i) => {
            const sx = x === 3 ? 1 : -1;
            const sy = y === 3 ? 1 : -1;
            return (
              <g key={i}>
                <line x1={x} y1={y} x2={x + sx * 12} y2={y} stroke="#ef4444" strokeWidth="2.5" opacity="0.6" />
                <line x1={x} y1={y} x2={x} y2={y + sy * 12} stroke="#ef4444" strokeWidth="2.5" opacity="0.6" />
              </g>
            );
          })}

          {/* Checkmark */}
          <path
            d="M 28 36 L 38 47 L 56 26"
            stroke="#ef4444"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
          />

          {/* Divider */}
          <line x1="70" y1="16" x2="70" y2="56" stroke="#ef4444" strokeWidth="1.5" opacity="0.3" />

          {/* COMPLETED text */}
          <text
            x="116"
            y="31"
            textAnchor="middle"
            fontSize="13"
            fontWeight="900"
            fill="#ef4444"
            opacity="0.9"
            letterSpacing="2"
            fontFamily="Arial Black, Arial, sans-serif"
          >
            COMPLETED
          </text>

          {/* Sub-line */}
          <line x1="82" y1="39" x2="150" y2="39" stroke="#ef4444" strokeWidth="1" opacity="0.3" />

          {/* Sub-label */}
          <text
            x="116"
            y="52"
            textAnchor="middle"
            fontSize="8"
            fontWeight="600"
            fill="#ef4444"
            opacity="0.5"
            letterSpacing="1.5"
            fontFamily="Arial, sans-serif"
          >
            ✓ CHORE DONE
          </text>
        </svg>
      </motion.div>

      {/* Impact ripple */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0.6, scale: 1 }}
        animate={{ opacity: 0, scale: 1.6, transition: { delay: 0.05, duration: 0.45, ease: "easeOut" } }}
        style={{ border: "2px solid rgba(239,68,68,0.5)", borderRadius: 8 }}
      />
    </motion.div>
  );
}