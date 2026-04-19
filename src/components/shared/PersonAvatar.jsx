import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { getAvatarStyle } from "@/components/people/colorUtils";

export default function PersonAvatar({ name, colorIndex = 0, avatarColor, size = "md" }) {
  const initial = (name || "?")[0].toUpperCase();
  const sizeClasses = {
    sm: "w-7 h-7 text-xs",
    md: "w-9 h-9 text-sm",
    lg: "w-12 h-12 text-lg",
  };

  // avatarColor (hex) takes priority over legacy colorIndex
  const style = getAvatarStyle(avatarColor || String(colorIndex));

  return (
    <motion.div
      whileHover={{ scale: 1.08 }}
      transition={{ type: "spring", stiffness: 300, damping: 18 }}
      className={cn(
        "rounded-full flex items-center justify-center font-semibold text-white shrink-0 select-none cursor-default",
        sizeClasses[size]
      )}
      style={{ background: style.hex }}
    >
      {initial}
    </motion.div>
  );
}