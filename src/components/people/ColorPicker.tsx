import { useRef } from "react";
import { motion } from "framer-motion";
import { COLOR_PALETTE } from "@/components/people/colorUtils";
import { cn } from "@/lib/utils";
import { Pipette } from "lucide-react";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export default function ColorPicker({ value, onChange }: ColorPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const isCustom = value && !COLOR_PALETTE.find((c) => c.hex === value);

  return (
    <div className="space-y-3">
      {/* Wheel / custom toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground font-medium">Palette</span>
        <div className="flex-1 h-px bg-border" />
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => { setTimeout(() => inputRef.current?.click(), 50); }}
          className={cn(
            "flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-colors",
            isCustom ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground border-border hover:bg-secondary"
          )}
        >
          <Pipette className="w-3 h-3" />
          Custom
          {/* Hidden native color input */}
          <input
            ref={inputRef}
            type="color"
            value={value && value.startsWith("#") ? value : "#6d5bd0"}
            onChange={(e) => onChange(e.target.value)}
            className="sr-only"
          />
        </motion.button>
      </div>

      {/* Color Wheel visual (CSS conic gradient) */}
      <div className="flex items-center gap-4 mb-1">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 rounded-full cursor-pointer shrink-0 relative"
          style={{
            background: "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)",
            boxShadow: `0 0 0 3px white, 0 0 0 5px ${value || "#6d5bd0"}`,
          }}
          onClick={() => { setTimeout(() => inputRef.current?.click(), 50); }}
        >
          <div className="absolute inset-2 rounded-full bg-white/40 backdrop-blur-sm flex items-center justify-center">
            <Pipette className="w-3.5 h-3.5 text-white drop-shadow" />
          </div>
        </motion.div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">Click the wheel or pick from palette below</p>
          {value && (
            <div className="flex items-center gap-2 mt-1">
              <div className="w-5 h-5 rounded-full border border-border/60" style={{ background: value }} />
              <span className="text-xs font-mono text-muted-foreground">{value}</span>
            </div>
          )}
        </div>
      </div>

      {/* Palette grid */}
      <div className="grid grid-cols-10 gap-1.5">
        {COLOR_PALETTE.map((color) => (
          <motion.button
            key={color.hex}
            whileHover={{ scale: 1.25, y: -2 }}
            whileTap={{ scale: 0.85 }}
            onClick={() => onChange(color.hex)}
            title={color.label}
            className="relative w-7 h-7 rounded-full border-2 transition-all"
            style={{
              background: color.hex,
              borderColor: value === color.hex ? "#1e293b" : "transparent",
              boxShadow: value === color.hex ? `0 0 0 2px white, 0 0 0 4px ${color.hex}` : "none",
            }}
          >
            {value === color.hex && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold drop-shadow"
              >
                ✓
              </motion.span>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
