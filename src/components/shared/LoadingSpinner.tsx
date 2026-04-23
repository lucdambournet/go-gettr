import { motion } from "framer-motion";

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 0.75, ease: "linear" }}
        className="w-7 h-7 border-[3px] border-primary border-t-transparent rounded-full"
      />
    </div>
  );
}
