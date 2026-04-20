import { useEffect, useRef } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedProgressProps {
  value?: number;
  className?: string;
  color?: string;
  showGlow?: boolean;
  height?: string;
}

export default function AnimatedProgress({ value = 0, className, color, showGlow = true, height = "h-2.5" }: AnimatedProgressProps) {
  const spring = useSpring(0, { stiffness: 60, damping: 16, mass: 0.8 });

  useEffect(() => {
    spring.set(Math.max(0, Math.min(100, value)));
  }, [value]);

  const width = useTransform(spring, v => `${v}%`);

  const isComplete = value >= 100;

  return (
    <div className={cn("relative overflow-hidden rounded-full bg-secondary", height, className)}>
      {/* Track shimmer */}
      <motion.div
        className="absolute inset-0 rounded-full opacity-30"
        animate={{ x: ["-100%", "200%"] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
        style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)", width: "50%" }}
      />

      {/* Fill */}
      <motion.div
        className="absolute left-0 top-0 bottom-0 rounded-full"
        style={{
          width,
          background: isComplete
            ? "linear-gradient(90deg, #10b981, #34d399)"
            : color || "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary)/0.7))",
        }}
      >
        {/* Glow pulse at the tip */}
        {showGlow && (
          <motion.div
            className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full"
            animate={{ opacity: [0.6, 1, 0.6], scale: [0.8, 1.4, 0.8] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            style={{
              background: isComplete ? "#10b981" : "hsl(var(--primary))",
              filter: "blur(4px)",
            }}
          />
        )}
      </motion.div>

      {/* Completion sparkle flash */}
      {isComplete && (
        <motion.div
          className="absolute inset-0 rounded-full"
          initial={{ opacity: 0.8 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)" }}
        />
      )}
    </div>
  );
}