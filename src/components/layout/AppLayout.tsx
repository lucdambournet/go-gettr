import React from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { Menu, X, ChevronLeft } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import PageFade from "@/components/layout/PageFade";
import { useNotificationBadge } from "@/hooks/useNotificationBadge";
import { useAppManifest } from "@/hooks/useAppManifest";
import { soundNav, soundMenuOpen, soundMenuClose } from "@/lib/useSound";

// ── Unique colorful nav icons (SVG-based for multi-color) ──────────────────

interface IconProps { active: boolean; }
interface NavItem { path: string; label: string; Icon: React.FC<IconProps>; }

function IconDashboard({ active }: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="1" y="1" width="7" height="7" rx="2" fill={active ? "white" : "#6366f1"} opacity={active ? 1 : 0.85} />
      <rect x="10" y="1" width="7" height="7" rx="2" fill={active ? "white" : "#f59e0b"} opacity={active ? 0.9 : 0.75} />
      <rect x="1" y="10" width="7" height="7" rx="2" fill={active ? "white" : "#10b981"} opacity={active ? 0.9 : 0.75} />
      <rect x="10" y="10" width="7" height="7" rx="2" fill={active ? "white" : "#ec4899"} opacity={active ? 0.85 : 0.65} />
    </svg>
  );
}

function IconToday({ active }: IconProps) {
  const c = active ? "white" : "#f59e0b";
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="4.5" fill={c} />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
        const r = deg * Math.PI / 180;
        const x1 = 9 + 6.2 * Math.cos(r);
        const y1 = 9 + 6.2 * Math.sin(r);
        const x2 = 9 + 7.8 * Math.cos(r);
        const y2 = 9 + 7.8 * Math.sin(r);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth="1.5" strokeLinecap="round" />;
      })}
    </svg>
  );
}

function IconPeople({ active }: IconProps) {
  const c1 = active ? "white" : "#6366f1";
  const c2 = active ? "rgba(255,255,255,0.7)" : "#a5b4fc";
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="11.5" cy="6" r="3" fill={c2} />
      <path d="M8 17c0-2.21 1.567-4 3.5-4s3.5 1.79 3.5 4" stroke={c2} strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <circle cx="6.5" cy="6.5" r="3.2" fill={c1} />
      <path d="M1 17c0-2.43 2.462-4.4 5.5-4.4" stroke={c1} strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function IconChores({ active }: IconProps) {
  const c = active ? "white" : "#10b981";
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="2" y="2" width="14" height="14" rx="3" stroke={c} strokeWidth="1.5" fill={active ? "rgba(255,255,255,0.15)" : "rgba(16,185,129,0.1)"} />
      <path d="M5.5 9l2.5 2.5 5-5" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconWeekly({ active }: IconProps) {
  const c = active ? "white" : "#8b5cf6";
  const dot = active ? "rgba(255,255,255,0.8)" : "#c4b5fd";
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="2" y="3" width="14" height="13" rx="2.5" stroke={c} strokeWidth="1.4" fill={active ? "rgba(255,255,255,0.12)" : "rgba(139,92,246,0.08)"} />
      <path d="M6 1v4M12 1v4" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
      <line x1="2" y1="7.5" x2="16" y2="7.5" stroke={c} strokeWidth="1" opacity="0.6" />
      {[[5, 10], [9, 10], [13, 10], [5, 13.5], [9, 13.5]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.2" fill={dot} />
      ))}
    </svg>
  );
}

function IconCheckIn({ active }: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 2C9 2 4 6 4 10.5C4 13.537 6.239 16 9 16C11.761 16 14 13.537 14 10.5C14 6 9 2 9 2Z"
        fill={active ? "white" : "url(#flame-grad)"} />
      <circle cx="9" cy="11" r="2.2" fill={active ? "rgba(255,255,255,0.4)" : "#fde68a"} />
      <defs>
        <linearGradient id="flame-grad" x1="9" y1="2" x2="9" y2="16" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f97316" />
          <stop offset="1" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function IconBank({ active }: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="7.5" fill={active ? "white" : "url(#coin-grad)"} />
      <text x="9" y="13.5" textAnchor="middle" fontSize="10" fontWeight="bold"
        fill={active ? "#f59e0b" : "#78350f"}>$</text>
      <defs>
        <linearGradient id="coin-grad" x1="2" y1="2" x2="16" y2="16" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fbbf24" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function IconNotifications({ active }: IconProps) {
  const c = active ? "white" : "#ec4899";
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 2a5 5 0 0 0-5 5v3l-1.5 2.5h13L14 10V7a5 5 0 0 0-5-5z"
        fill={active ? "rgba(255,255,255,0.9)" : "rgba(236,72,153,0.15)"} stroke={c} strokeWidth="1.3" />
      <path d="M7.5 14.5c0 .828.672 1.5 1.5 1.5s1.5-.672 1.5-1.5" stroke={c} strokeWidth="1.3" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function IconDevPanel({ active }: IconProps) {
  const c = active ? "white" : "#f59e0b";
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="1" y="3" width="16" height="12" rx="2.5" stroke={c} strokeWidth="1.3" fill={active ? "rgba(255,255,255,0.1)" : "rgba(245,158,11,0.08)"} />
      <path d="M4 8l2.5 2.5L4 13" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <line x1="9" y1="13" x2="14" y2="13" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconSettings({ active }: IconProps) {
  const c = active ? "white" : "#6b7280";
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="2.5" fill={active ? "rgba(255,255,255,0.4)" : "rgba(107,114,128,0.2)"} stroke={c} strokeWidth="1.3" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
        const r = deg * Math.PI / 180;
        const x1 = 9 + 4.2 * Math.cos(r);
        const y1 = 9 + 4.2 * Math.sin(r);
        const x2 = 9 + 5.8 * Math.cos(r);
        const y2 = 9 + 5.8 * Math.sin(r);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth="1.6" strokeLinecap="round" />;
      })}
    </svg>
  );
}

const navItems: NavItem[] = [
  { path: "/Dashboard", label: "Dashboard", Icon: IconDashboard },
  { path: "/Daily", label: "Today", Icon: IconToday },
  { path: "/People", label: "People", Icon: IconPeople },
  { path: "/Chores", label: "Chores", Icon: IconChores },
  { path: "/WeeklyView", label: "Weekly View", Icon: IconWeekly },
  { path: "/CheckIn", label: "Check-In", Icon: IconCheckIn },
  { path: "/Bank", label: "Bank", Icon: IconBank },
  { path: "/Notifications", label: "Notifications", Icon: IconNotifications },
  { path: "/Settings", label: "Settings", Icon: IconSettings },
  { path: "/DevPanel", label: "Dev Panel", Icon: IconDevPanel },
];

// Full nav item for expanded sidebar
function NavItemLink({ item, isActive, onClick }: { item: NavItem; isActive: boolean; onClick?: () => void }) {
  const { unreadCount } = useNotificationBadge();
  const { Icon } = item;
  const showBadge = item.path === "/Notifications" && unreadCount > 0;

  const handleClick = () => {
    soundNav();
    onClick?.();
  };

  return (
    <Link
      to={item.path}
      onClick={handleClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all relative overflow-hidden",
        isActive
          ? "text-primary-foreground"
          : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
      )}
    >
      {isActive && (
        <motion.div
          layoutId="activeNav"
          className="absolute inset-0 bg-primary rounded-xl shadow-md shadow-primary/25"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
      )}
      <span className="relative z-10 flex items-center gap-3 w-full">
        <span className="relative shrink-0">
          <motion.span animate={isActive ? { scale: 1.15 } : { scale: 1 }} transition={{ type: "spring", stiffness: 300 }}>
            <Icon active={isActive} />
          </motion.span>
          <AnimatePresence>
            {showBadge && (
              <motion.span
                key="badge"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
                className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-destructive text-white text-[9px] font-black rounded-full flex items-center justify-center px-0.5 leading-none"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </span>
        {item.label}
      </span>
    </Link>
  );
}

// Icon-only nav item for collapsed sidebar — expands label on hover
function NavItemCollapsed({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const { unreadCount } = useNotificationBadge();
  const { Icon } = item;
  const showBadge = item.path === "/Notifications" && unreadCount > 0;
  const [hovered, setHovered] = useState(false);

  return (
    <div className="relative" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <Link
        to={item.path}
        onClick={() => soundNav()}
        className={cn(
          "relative flex items-center justify-center w-10 h-10 rounded-xl transition-all",
          isActive ? "text-primary-foreground" : "text-muted-foreground hover:bg-secondary/80"
        )}
      >
        {isActive && (
          <motion.div
            layoutId="activeNavCollapsed"
            className="absolute inset-0 bg-primary rounded-xl shadow-md shadow-primary/25"
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
        )}
        <span className="relative z-10">
          <motion.span animate={isActive ? { scale: 1.15 } : { scale: 1 }} transition={{ type: "spring", stiffness: 300 }}>
            <Icon active={isActive} />
          </motion.span>
          {showBadge && (
            <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 bg-destructive text-white text-[8px] font-black rounded-full flex items-center justify-center px-0.5 leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </span>
      </Link>

      {/* Hover tooltip label */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.12 }}
            className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 pointer-events-none"
          >
            <div className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shadow-lg",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-popover text-foreground border border-border"
            )}>
              {item.label}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── App Logo Mark ─────────────────────────────────────────────────────────────

function AppLogoMark({ iconUrl }: { iconUrl: string | null }) {
  if (iconUrl) {
    return <img src={iconUrl} alt="logo" className="w-9 h-9 rounded-xl object-cover shadow-md shadow-primary/30" />;
  }
  return (
    <motion.div
      whileHover={{ rotate: 15, scale: 1.15 }}
      transition={{ type: "spring", stiffness: 350, damping: 14 }}
      className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/30 shrink-0"
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 2C10 2 5 7 5 12C5 14.761 7.239 17 10 17C12.761 17 15 14.761 15 12C15 7 10 2 10 2Z" fill="url(#logo-flame)" />
        <circle cx="10" cy="12.5" r="2.5" fill="rgba(255,255,255,0.4)" />
        <defs>
          <linearGradient id="logo-flame" x1="10" y1="2" x2="10" y2="17" gradientUnits="userSpaceOnUse">
            <stop stopColor="#f97316" />
            <stop offset="1" stopColor="#fde68a" />
          </linearGradient>
        </defs>
      </svg>
    </motion.div>
  );
}

export default function AppLayout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { name: appName, icon: appIcon } = useAppManifest();

  const sidebarWidth = sidebarCollapsed ? 56 : 256;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: sidebarWidth }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="hidden md:flex flex-col bg-card border-r border-border fixed h-full overflow-hidden"
        style={{ width: sidebarWidth, zIndex: 30 }}
      >
        {/* Logo area */}
        <div className="p-3 border-b border-border flex items-center justify-between shrink-0 overflow-hidden" style={{ minHeight: 64 }}>
          <AnimatePresence mode="wait">
            {!sidebarCollapsed ? (
              <motion.div
                key="expanded-logo"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2.5 overflow-hidden"
              >
                <AppLogoMark iconUrl={appIcon} />
                <h1 className="text-lg font-black text-foreground tracking-tight font-nunito leading-tight whitespace-nowrap">
                  {appName}
                </h1>
              </motion.div>
            ) : (
              <motion.div
                key="collapsed-logo"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="mx-auto"
              >
                <AppLogoMark iconUrl={appIcon} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-hidden">
          {navItems.map((item, i) => {
            const isActive = location.pathname === item.path;
            return (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 + i * 0.04, type: "spring", stiffness: 200, damping: 22 }}
              >
                {sidebarCollapsed ? (
                  <NavItemCollapsed item={item} isActive={isActive} />
                ) : (
                  <NavItemLink item={item} isActive={isActive} />
                )}
              </motion.div>
            );
          })}
        </nav>
      </motion.aside>

      {/* Collapse toggle */}
      <motion.div
        animate={{ left: sidebarWidth }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="hidden md:flex fixed top-1/2 -translate-y-1/2"
        style={{ zIndex: 50, transform: "translate(-50%, -50%)" }}
      >
        <button
          onClick={() => setSidebarCollapsed(v => !v)}
          className="flex items-center justify-center w-4 h-8 rounded-full bg-border hover:bg-secondary border border-border hover:border-border transition-colors group shadow-sm"
        >
          <ChevronLeft
            className="w-2.5 h-2.5 text-muted-foreground group-hover:text-foreground transition-transform duration-300"
            style={{ transform: sidebarCollapsed ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </button>
      </motion.div>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b border-border flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2">
          {appIcon
            ? <img src={appIcon} alt="logo" className="w-7 h-7 rounded-lg object-cover" />
            : (
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2C10 2 5 7 5 12C5 14.761 7.239 17 10 17C12.761 17 15 14.761 15 12C15 7 10 2 10 2Z" fill="white" />
                  <circle cx="10" cy="12.5" r="2.5" fill="rgba(255,255,255,0.4)" />
                </svg>
              </div>
            )
          }
          <h1 className="text-base font-black text-foreground font-nunito">{appName}</h1>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => { mobileOpen ? soundMenuClose() : soundMenuOpen(); setMobileOpen(!mobileOpen); }}
          className="p-2"
        >
          <AnimatePresence mode="wait">
            {mobileOpen ? (
              <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                <X className="w-5 h-5" />
              </motion.div>
            ) : (
              <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                <Menu className="w-5 h-5" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Mobile Nav Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 z-30 bg-black/40"
            onClick={() => setMobileOpen(false)}
          >
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute top-14 left-0 right-0 bg-card border-b border-border p-4 space-y-1"
              onClick={(e) => e.stopPropagation()}
            >
              {navItems.map((item, i) => {
                const isActive = location.pathname === item.path;
                return (
                  <motion.div
                    key={item.path}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <NavItemLink item={item} isActive={isActive} onClick={() => setMobileOpen(false)} />
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content — shifts with sidebar */}
      <motion.main
        animate={{ marginLeft: sidebarWidth }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="flex-1 pt-14 md:pt-0"
        style={{ marginLeft: sidebarWidth }}
      >
        <div className="p-4 md:p-8">
          <PageFade key={location.pathname}>
            <Outlet />
          </PageFade>
        </div>
      </motion.main>
    </div>
  );
}