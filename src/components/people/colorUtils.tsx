// Pastel + vibrant color palette stored as hex strings
export const COLOR_PALETTE = [
  // Row 1 - Pastels
  { hex: "#f9a8d4", label: "Pastel Pink" },
  { hex: "#fda4af", label: "Pastel Rose" },
  { hex: "#fdba74", label: "Pastel Orange" },
  { hex: "#fde68a", label: "Pastel Yellow" },
  { hex: "#bbf7d0", label: "Pastel Mint" },
  { hex: "#6ee7b7", label: "Pastel Green" },
  { hex: "#93c5fd", label: "Pastel Blue" },
  { hex: "#c4b5fd", label: "Pastel Violet" },
  { hex: "#f0abfc", label: "Pastel Purple" },
  { hex: "#94a3b8", label: "Pastel Slate" },
  // Row 2 - Vivid
  { hex: "#ec4899", label: "Hot Pink" },
  { hex: "#ef4444", label: "Red" },
  { hex: "#f97316", label: "Orange" },
  { hex: "#eab308", label: "Yellow" },
  { hex: "#22c55e", label: "Green" },
  { hex: "#14b8a6", label: "Teal" },
  { hex: "#3b82f6", label: "Blue" },
  { hex: "#6366f1", label: "Indigo" },
  { hex: "#a855f7", label: "Purple" },
  { hex: "#334155", label: "Dark Slate" },
];

export interface AvatarStyle {
  hex: string;
  textColor: string;
}

// Returns { hex, textColor } for a given stored avatar_color value (hex string or legacy index)
export function getAvatarStyle(avatarColor: string | undefined | null): AvatarStyle {
  // New format: hex string like "#f9a8d4"
  if (avatarColor && avatarColor.startsWith("#")) {
    return { hex: avatarColor, textColor: "white" };
  }
  // Legacy: index-based
  const legacyColors = [
    "#6d5bd0", "#f59e0b", "#3dbe8a", "#e05b84", "#3ba0d4",
    "#ef4444", "#84cc16", "#a855f7", "#14b8a6", "#fb7185",
  ];
  const idx = parseInt(avatarColor ?? "0") || 0;
  return { hex: legacyColors[idx % legacyColors.length], textColor: "white" };
}