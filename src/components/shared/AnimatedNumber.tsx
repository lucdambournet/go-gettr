import { motion } from "framer-motion";
import { useMemo } from "react";

interface AnimatedNumberProps {
  value: number | undefined | null;
  className?: string;
  decimals?: number;
  prefix?: string;
}

export default function AnimatedNumber({ value, className = "", decimals = 2, prefix = "" }: AnimatedNumberProps) {
  const formatted = typeof value === "number" ? value.toFixed(decimals) : "0";
  const chars = (prefix + formatted).split("");

  return (
    <span className={className}>
      {chars.map((char, i) => (
        <motion.span
          key={`${i}-${char}-${formatted}`}
          initial={{ y: "1em", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 120, damping: 14, delay: i * 0.015 }}
          className="inline-block tabular-nums"
          style={{ display: "inline-block", minWidth: char === "." || char === "$" ? "auto" : "0.6em", textAlign: "center" }}
        >
          {char}
        </motion.span>
      ))}
    </span>
  );
}