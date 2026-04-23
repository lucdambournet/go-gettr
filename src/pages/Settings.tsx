import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Palette, RotateCcw, Check, Sparkles, Plus, Trash2, X, Bell, DollarSign, Globe, LogOut, Users, UserPlus, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { entities } from "@/api/entities";
import { useQueryClient } from "@tanstack/react-query";
import FamilyMemberList from "@/components/family/FamilyMemberList";
import InviteDialog from "@/components/family/InviteDialog";

type ThemeVars = { primary: string; accent: string; background: string; foreground: string; card: string;[key: string]: string };

function hslToHex(hslStr: string): string {
  if (!hslStr) return "#888888";
  const parts = hslStr.split(" ").map((v) => parseFloat(v));
  if (parts.length < 3 || parts.some(isNaN)) return "#888888";
  const [h, s, l] = parts;
  const sat = s / 100, lig = l / 100;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (lig - a * Math.max(Math.min(k - 3, 9 - k, 1), -1))).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHsl(hex: string): string {
  if (!hex || !hex.startsWith("#")) return "0 0% 50%";
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function deriveTokens(vars: ThemeVars): Record<string, string> {
  const bg = vars.background || "225 20% 97%";
  const parts = bg.split(" ").map(parseFloat);
  const [h, s, l] = parts;
  const isDark = l < 30;

  const secL = isDark ? Math.min(l + 8, 30) : Math.max(l - 5, 70);
  const secFgL = isDark ? 88 : 12;
  const mutedL = isDark ? Math.min(l + 5, 25) : Math.max(l - 3, 75);
  const mutedFgL = isDark ? 52 : 42;
  const inputL = isDark ? Math.min(l + 6, 22) : Math.max(l - 4, 82);
  const borderL = isDark ? Math.min(l + 5, 20) : Math.max(l - 8, 80);

  const fg = vars.foreground || `${h} ${s * 0.3}% ${secFgL}%`;
  const fgH = parseInt(fg.split(" ")[0]) || h;

  return {
    secondary: `${h} ${Math.max(s - 5, 5)}% ${secL}%`,
    "secondary-foreground": `${fgH} 25% ${secFgL}%`,
    muted: `${h} ${Math.max(s - 8, 3)}% ${mutedL}%`,
    "muted-foreground": `${fgH} 10% ${mutedFgL}%`,
    input: `${h} ${Math.max(s - 8, 4)}% ${inputL}%`,
    "card-foreground": vars.foreground,
    "popover": vars.card,
    "popover-foreground": vars.foreground,
    "sidebar-background": vars.card,
    "sidebar-foreground": vars.foreground,
    "sidebar-primary": vars.primary,
    "sidebar-primary-foreground": "0 0% 100%",
    "sidebar-accent": `${h} ${Math.max(s - 5, 5)}% ${isDark ? secL - 2 : secL + 2}%`,
    "sidebar-accent-foreground": vars.foreground,
    "sidebar-border": `${h} ${Math.max(s - 8, 3)}% ${borderL}%`,
    "sidebar-ring": vars.primary,
    ring: vars.primary,
    border: `${h} ${Math.max(s - 8, 4)}% ${borderL}%`,
  };
}

function applyTheme(vars: ThemeVars): void {
  const root = document.documentElement;
  const derived = deriveTokens(vars);
  const all = { ...derived, ...vars };
  Object.entries(all).forEach(([key, val]) => root.style.setProperty(`--${key}`, val));
}

const DEFAULT_THEME: ThemeVars = {
  primary: "245 58% 51%", accent: "33 90% 55%",
  background: "225 20% 97%", foreground: "230 25% 10%",
  card: "0 0% 100%",
};

interface ThemeDef {
  name: string;
  dot1: string;
  dot2: string;
  dot3: string;
  vars: ThemeVars;
  isCustom?: boolean;
}

const BUILT_IN_THEMES: ThemeDef[] = [
  {
    name: "Indigo", dot1: "#6655d4", dot2: "#f59e0b", dot3: "#f6f7fb",
    vars: { primary: "245 58% 51%", accent: "33 90% 55%", background: "225 20% 97%", foreground: "230 25% 10%", card: "0 0% 100%" }
  },
  {
    name: "Forest", dot1: "#2e8a57", dot2: "#d97706", dot3: "#f5fbf7",
    vars: { primary: "142 50% 36%", accent: "35 80% 50%", background: "140 18% 97%", foreground: "150 30% 9%", card: "0 0% 100%" }
  },
  {
    name: "Ocean", dot1: "#1a7fb5", dot2: "#17a2b8", dot3: "#f2f8fd",
    vars: { primary: "200 72% 42%", accent: "190 65% 38%", background: "210 22% 97%", foreground: "220 30% 9%", card: "0 0% 100%" }
  },
  {
    name: "Sunset", dot1: "#e0541e", dot2: "#c42d5a", dot3: "#fdf9f6",
    vars: { primary: "16 82% 53%", accent: "338 72% 50%", background: "20 22% 98%", foreground: "20 35% 8%", card: "0 0% 100%" }
  },
  {
    name: "Lavender", dot1: "#8a56c7", dot2: "#d44fa0", dot3: "#f8f4fd",
    vars: { primary: "270 56% 56%", accent: "318 62% 56%", background: "270 22% 97%", foreground: "270 28% 10%", card: "0 0% 100%" }
  },
  {
    name: "Rose", dot1: "#d4345a", dot2: "#de7010", dot3: "#fdf6f8",
    vars: { primary: "344 76% 52%", accent: "30 86% 52%", background: "350 22% 98%", foreground: "340 28% 9%", card: "0 0% 100%" }
  },
  {
    name: "Midnight", dot1: "#8070e0", dot2: "#f59e0b", dot3: "#0e1119",
    vars: { primary: "248 65% 65%", accent: "38 92% 58%", background: "230 22% 7%", foreground: "220 15% 93%", card: "228 20% 11%" }
  },
  {
    name: "Charcoal", dot1: "#90a8c5", dot2: "#d4a017", dot3: "#181d23",
    vars: { primary: "214 28% 62%", accent: "44 82% 54%", background: "220 16% 9%", foreground: "220 12% 88%", card: "220 14% 13%" }
  },
  {
    name: "Mint", dot1: "#24907a", dot2: "#2080b0", dot3: "#f4fbf8",
    vars: { primary: "162 57% 38%", accent: "202 68% 44%", background: "165 20% 97%", foreground: "165 28% 9%", card: "0 0% 100%" }
  },
  {
    name: "Amber", dot1: "#c47a10", dot2: "#c43318", dot3: "#fdfaf3",
    vars: { primary: "38 94% 46%", accent: "14 86% 52%", background: "40 28% 98%", foreground: "35 32% 9%", card: "0 0% 100%" }
  },
  {
    name: "Candy", dot1: "#cc3d8a", dot2: "#0e9988", dot3: "#fdf4fb",
    vars: { primary: "320 72% 55%", accent: "178 68% 42%", background: "312 22% 98%", foreground: "320 28% 9%", card: "0 0% 100%" }
  },
  {
    name: "Deep Sea", dot1: "#0e82a2", dot2: "#148964", dot3: "#060e18",
    vars: { primary: "196 82% 36%", accent: "162 62% 34%", background: "212 28% 6%", foreground: "200 18% 90%", card: "210 24% 10%" }
  },
];

const CUSTOM_KEY = "choretracker-custom-themes";
const STORAGE_KEY = "choretracker-theme";
const ACTIVE_NAME_KEY = "choretracker-active-name";
const PREFS_KEY = "choretracker-prefs";

const SPECTRUM = [
  "#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e",
  "#14b8a6", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#f43f5e",
];

const COLOR_FIELDS: { key: string; label: string; desc: string }[] = [
  { key: "primary", label: "Primary", desc: "Buttons & active states" },
  { key: "accent", label: "Accent", desc: "Highlights & badges" },
  { key: "background", label: "Background", desc: "Page background" },
  { key: "foreground", label: "Text", desc: "Main text color" },
  { key: "card", label: "Card", desc: "Card surface" },
];

interface ColorSwatchProps {
  label: string;
  desc: string;
  hexVal: string;
  onChange: (val: string) => void;
}

function ColorSwatch({ label, desc, hexVal, onChange }: ColorSwatchProps) {
  const [open, setOpen] = useState(false);
  const [hexInput, setHexInput] = useState(hexVal);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setHexInput(hexVal); }, [hexVal]);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div className="flex items-center gap-3">
      <div className="relative shrink-0" ref={ref}>
        <motion.button
          type="button" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
          onClick={() => setOpen(v => !v)}
          className="w-11 h-11 rounded-xl border-2 border-white/20 focus:outline-none relative overflow-hidden"
          style={{ background: hexVal, boxShadow: open ? `0 0 0 3px ${hexVal}55, 0 0 16px ${hexVal}66` : `0 0 0 2px ${hexVal}33` }}
        >
          <span className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/25 rounded-xl">
            <Palette className="w-4 h-4 text-white drop-shadow" />
          </span>
        </motion.button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 4 }}
              transition={{ type: "spring", stiffness: 400, damping: 26 }}
              className="absolute z-50 left-0 top-14 bg-card border border-border rounded-2xl shadow-2xl p-4 flex flex-col gap-3 w-[210px]"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">{label}</span>
                <button onClick={() => setOpen(false)} className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="relative w-full h-20 rounded-xl cursor-pointer overflow-hidden border border-border/50"
                style={{ background: hexVal }} onClick={() => inputRef.current?.click()}>
                <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,rgba(255,255,255,.22) 0%,transparent 50%,rgba(0,0,0,.18) 100%)" }} />
                <div className="absolute bottom-2 right-2 bg-black/30 backdrop-blur-sm rounded-lg px-2 py-0.5 flex items-center gap-1">
                  <Palette className="w-3 h-3 text-white" /><span className="text-[10px] text-white font-medium">Pick</span>
                </div>
                <input ref={inputRef} type="color" value={hexVal} onChange={e => onChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {SPECTRUM.map(c => (
                  <motion.button key={c} whileHover={{ scale: 1.3 }} whileTap={{ scale: 0.85 }} onClick={() => onChange(c)}
                    className="w-5 h-5 rounded-full border-2 transition-all"
                    style={{ background: c, borderColor: hexVal === c ? "white" : "transparent", boxShadow: hexVal === c ? `0 0 0 2px ${c}` : "none" }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 bg-secondary/60 rounded-xl px-3 py-2">
                <div className="w-3.5 h-3.5 rounded shrink-0 border border-border" style={{ background: hexVal }} />
                <input type="text" value={hexInput} onChange={e => { setHexInput(e.target.value); if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onChange(e.target.value); }}
                  className="flex-1 bg-transparent text-xs font-mono text-foreground outline-none" placeholder="#000000" maxLength={7} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

interface ThemeChipProps {
  theme: ThemeDef;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
  isCustom: boolean;
}

function ThemeChip({ theme, isActive, onClick, onDelete, isCustom }: ThemeChipProps) {
  return (
    <motion.div whileHover={{ y: -2, scale: 1.04 }} whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 350, damping: 18 }} className="relative group">
      <button onClick={onClick}
        className={cn("w-full flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all",
          isActive ? "border-primary shadow-md bg-primary/5" : "border-border bg-card hover:border-primary/50")}>
        <div className="flex gap-1">
          {[theme.dot1, theme.dot2, theme.dot3].map((c, i) => (
            <div key={i} className="w-5 h-5 rounded-full shadow-sm border border-black/10" style={{ background: c }} />
          ))}
        </div>
        <span className="text-[11px] font-semibold text-foreground leading-none">{theme.name}</span>
      </button>
      {isCustom && (
        <button onClick={e => { e.stopPropagation(); onDelete(); }}
          className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-destructive text-white rounded-full items-center justify-center shadow hidden group-hover:flex z-10">
          <Trash2 className="w-2.5 h-2.5" />
        </button>
      )}
      <AnimatePresence>
        {isActive && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow pointer-events-none">
            <Check className="w-3 h-3 text-primary-foreground" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <motion.button type="button" whileTap={{ scale: 0.92 }} onClick={() => onChange(!value)}
      className={cn("w-11 h-6 rounded-full transition-colors duration-300 relative shrink-0", value ? "bg-primary" : "bg-secondary border border-border")}>
      <motion.div animate={{ x: value ? 20 : 2 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow" />
    </motion.button>
  );
}

function SettingRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border/50 last:border-0">
      <div>
        <div className="text-sm font-semibold text-foreground">{label}</div>
        {desc && <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>}
      </div>
      {children}
    </div>
  );
}

const DEFAULT_PREFS = {
  currency: "USD",
  currencySymbol: "$",
  notifyStreakRisk: true,
  notifyChoresDue: true,
  notifyPayoutRequest: true,
  soundEffects: false,
  compactMode: false,
  showEarningsOnDashboard: true,
  weekStartsMonday: true,
};

export default function Settings() {
  const { signOut, isParent, family, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingFamilyName, setEditingFamilyName] = useState(false);
  const [familyNameInput, setFamilyNameInput] = useState('');
  const [savingFamilyName, setSavingFamilyName] = useState(false);

  const saveFamilyName = useCallback(async () => {
    if (!family || !familyNameInput.trim()) return;
    setSavingFamilyName(true);
    await entities.Family.update(family.id, { name: familyNameInput.trim() });
    await Promise.all([
      refreshProfile(),
      queryClient.invalidateQueries({ queryKey: ['family-profiles', family.id] }),
    ]);
    setSavingFamilyName(false);
    setEditingFamilyName(false);
  }, [family, familyNameInput, queryClient, refreshProfile]);
  const [current, setCurrent] = useState<ThemeVars>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") || DEFAULT_THEME; } catch { return DEFAULT_THEME; }
  });
  const [activeName, setActiveName] = useState(() => localStorage.getItem(ACTIVE_NAME_KEY) || "Indigo");
  const [customThemes, setCustomThemes] = useState<ThemeDef[]>(() => {
    try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? "[]") || []; } catch { return []; }
  });
  const [prefs, setPrefs] = useState(() => {
    try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}") }; } catch { return DEFAULT_PREFS; }
  });
  const [saved, setSaved] = useState(false);
  const [newThemeName, setNewThemeName] = useState("");
  const [showNameInput, setShowNameInput] = useState(false);

  useEffect(() => { applyTheme(current); }, [current]);

  const allThemes = [...BUILT_IN_THEMES, ...customThemes];

  const handlePreset = (theme: ThemeDef) => { setActiveName(theme.name); setCurrent(theme.vars); applyTheme(theme.vars); };
  const updateVar = (key: string, hexVal: string) => {
    const hsl = hexToHsl(hexVal);
    const next: ThemeVars = { ...current, [key]: hsl };
    setCurrent(next); applyTheme(next); setActiveName("");
  };

  const setPref = (key: string, val: unknown) => setPrefs((p: typeof DEFAULT_PREFS) => ({ ...p, [key]: val }));

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    localStorage.setItem(ACTIVE_NAME_KEY, activeName);
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  const handleReset = () => {
    const def = BUILT_IN_THEMES[0];
    setCurrent(def.vars); applyTheme(def.vars); setActiveName(def.name);
    localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(ACTIVE_NAME_KEY);
  };

  const handleSaveAsNew = () => {
    if (!newThemeName.trim()) return;
    const t: ThemeDef = { name: newThemeName.trim(), dot1: hslToHex(current.primary), dot2: hslToHex(current.accent), dot3: hslToHex(current.background), vars: { ...current }, isCustom: true };
    const updated = [...customThemes, t];
    setCustomThemes(updated); localStorage.setItem(CUSTOM_KEY, JSON.stringify(updated));
    setActiveName(t.name); setNewThemeName(""); setShowNameInput(false);
  };

  const CURRENCIES = [
    { code: "USD", symbol: "$", label: "US Dollar" },
    { code: "EUR", symbol: "€", label: "Euro" },
    { code: "GBP", symbol: "£", label: "British Pound" },
    { code: "CAD", symbol: "CA$", label: "Canadian Dollar" },
    { code: "AUD", symbol: "A$", label: "Australian Dollar" },
    { code: "JPY", symbol: "¥", label: "Japanese Yen" },
    { code: "CHF", symbol: "Fr", label: "Swiss Franc" },
    { code: "NZD", symbol: "NZ$", label: "New Zealand Dollar" },
  ];

  return (
    <div className="space-y-8">
      <div className="relative -mx-4 md:-mx-8 -mt-4 md:-mt-8 px-4 md:px-8 pt-8 md:pt-10 pb-6 overflow-hidden"
        style={{ background: "linear-gradient(135deg, #6b728028 0%, #6b728010 70%, transparent 100%)" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 85% 50%, #6b72801e 0%, transparent 65%)" }} />
        <div className="relative">
          <h1 className="text-3xl font-black text-foreground tracking-tight font-nunito">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Customize your ChoreTracker experience</p>
        </div>
      </div>

      <div className="max-w-3xl space-y-6">
        {isParent && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Family
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                {editingFamilyName ? (
                  <div className="flex flex-1 items-center gap-2">
                    <Input
                      value={familyNameInput}
                      onChange={e => setFamilyNameInput(e.target.value)}
                      className="h-9 rounded-xl text-sm flex-1"
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') saveFamilyName(); if (e.key === 'Escape') setEditingFamilyName(false); }}
                    />
                    <Button size="sm" className="h-9 rounded-xl px-4 text-xs" onClick={saveFamilyName} disabled={savingFamilyName}>
                      {savingFamilyName ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-9 rounded-xl" onClick={() => setEditingFamilyName(false)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-1 items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-foreground">{family?.name}</div>
                      <div className="text-xs text-muted-foreground">Family name</div>
                    </div>
                    <Button size="sm" variant="outline" className="h-8 rounded-xl gap-1.5 text-xs"
                      onClick={() => { setFamilyNameInput(family?.name ?? ''); setEditingFamilyName(true); }}>
                      <Pencil className="w-3 h-3" /> Edit
                    </Button>
                  </div>
                )}
              </div>

              <FamilyMemberList />

              <Button
                variant="outline"
                className="w-full gap-2 h-10 rounded-xl text-sm font-semibold"
                onClick={() => setInviteOpen(true)}
              >
                <UserPlus className="w-4 h-4" /> Invite Member
              </Button>
            </CardContent>
          </Card>
        )}

        <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Theme Presets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {allThemes.map((theme) => (
                <ThemeChip key={theme.name} theme={theme} isActive={activeName === theme.name}
                  onClick={() => handlePreset(theme)} isCustom={!!theme.isCustom}
                  onDelete={() => { const u = customThemes.filter(t => t.name !== theme.name); setCustomThemes(u); localStorage.setItem(CUSTOM_KEY, JSON.stringify(u)); }} />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary" /> Build Your Own Theme
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {COLOR_FIELDS.map(({ key, label, desc }) => (
                <ColorSwatch key={key} label={label} desc={desc} hexVal={hslToHex(current[key])}
                  onChange={(val) => updateVar(key, val)} />
              ))}
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl border bg-secondary/40">
              <span className="text-xs text-muted-foreground font-medium">Preview:</span>
              {COLOR_FIELDS.map(({ key }) => (
                <div key={key} className="w-6 h-6 rounded-full border border-border shadow-sm" style={{ background: hslToHex(current[key]) }} />
              ))}
              <span className="ml-auto text-xs font-semibold text-primary">{activeName || "Custom"}</span>
            </div>

            <AnimatePresence>
              {showNameInput ? (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="flex gap-2 pt-1">
                    <Input value={newThemeName} onChange={e => setNewThemeName(e.target.value)} placeholder="Theme name…"
                      className="h-9 rounded-xl text-sm"
                      onKeyDown={e => { if (e.key === "Enter") handleSaveAsNew(); if (e.key === "Escape") setShowNameInput(false); }} autoFocus />
                    <Button size="sm" className="h-9 rounded-xl px-4" onClick={handleSaveAsNew} disabled={!newThemeName.trim()}>Add</Button>
                    <Button size="sm" variant="ghost" className="h-9 rounded-xl" onClick={() => setShowNameInput(false)}>Cancel</Button>
                  </div>
                </motion.div>
              ) : (
                <Button variant="outline" size="sm" className="gap-2 rounded-xl h-9 text-xs font-semibold" onClick={() => setShowNameInput(true)}>
                  <Plus className="w-3.5 h-3.5" /> Save as New Theme
                </Button>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" /> Currency
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="text-xl font-black text-primary">
                  {CURRENCIES.find(c => c.code === prefs.currency)?.symbol || "$"}
                </span>
              </div>
              <div>
                <div className="text-sm font-bold text-foreground">{prefs.currency}</div>
                <div className="text-xs text-muted-foreground">{CURRENCIES.find(c => c.code === prefs.currency)?.label}</div>
              </div>
              <div className="ml-auto text-xs text-muted-foreground">Active currency</div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {CURRENCIES.map(({ code, symbol }) => {
                const isActive = prefs.currency === code;
                return (
                  <motion.button key={code} type="button"
                    whileHover={{ y: -2, scale: 1.04 }}
                    whileTap={{ scale: 0.93 }}
                    onClick={() => { setPref("currency", code); setPref("currencySymbol", symbol); }}
                    className={cn("relative flex flex-col items-center justify-center py-3 px-2 rounded-2xl border-2 transition-all gap-0.5",
                      isActive ? "border-primary bg-primary/8 shadow-md shadow-primary/15" : "border-border bg-card hover:border-primary/40")}
                  >
                    <span className={cn("text-2xl font-black leading-none", isActive ? "text-primary" : "text-foreground")}>{symbol}</span>
                    <span className="text-[11px] font-bold text-muted-foreground">{code}</span>
                    <AnimatePresence>
                      {isActive && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" /> Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6">
            <SettingRow label="Streak at risk" desc="Alert when a streak may break today">
              <Toggle value={prefs.notifyStreakRisk} onChange={v => setPref("notifyStreakRisk", v)} />
            </SettingRow>
            <SettingRow label="Chores due today" desc="Remind about pending daily tasks">
              <Toggle value={prefs.notifyChoresDue} onChange={v => setPref("notifyChoresDue", v)} />
            </SettingRow>
            <SettingRow label="Payout requests" desc="Notify when a child requests cash-out">
              <Toggle value={prefs.notifyPayoutRequest} onChange={v => setPref("notifyPayoutRequest", v)} />
            </SettingRow>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" /> App Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6">
            <SettingRow label="Week starts on Monday" desc="Otherwise starts on Sunday">
              <Toggle value={prefs.weekStartsMonday} onChange={v => setPref("weekStartsMonday", v)} />
            </SettingRow>
            <SettingRow label="Show earnings on dashboard" desc="Display allowance & payout totals">
              <Toggle value={prefs.showEarningsOnDashboard} onChange={v => setPref("showEarningsOnDashboard", v)} />
            </SettingRow>
            <SettingRow label="Compact mode" desc="Reduce card padding and spacing">
              <Toggle value={prefs.compactMode} onChange={v => setPref("compactMode", v)} />
            </SettingRow>
            <SettingRow label="Sound effects" desc="Play sounds on check-in and completions">
              <Toggle value={prefs.soundEffects} onChange={v => setPref("soundEffects", v)} />
            </SettingRow>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button className="flex-1 gap-2 h-11 text-base font-semibold rounded-xl" onClick={handleSave}>
            {saved ? <Check className="w-4 h-4" /> : <Palette className="w-4 h-4" />}
            {saved ? "Saved!" : "Save Settings"}
          </Button>
          <Button variant="outline" className="gap-2 h-11 rounded-xl font-semibold" onClick={handleReset}>
            <RotateCcw className="w-4 h-4" /> Reset Theme
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <LogOut className="w-4 h-4 text-destructive" /> Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="gap-2 h-11 rounded-xl font-semibold text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive"
              onClick={signOut}
            >
              <LogOut className="w-4 h-4" /> Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
