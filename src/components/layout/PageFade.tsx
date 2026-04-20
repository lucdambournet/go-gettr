/**
 * PageFade — pure CSS keyframe fade-in on mount.
 * No framer-motion involved, so it never conflicts with in-page animations.
 */
import { type ReactNode } from "react";

interface PageFadeProps {
  children: ReactNode;
}

export default function PageFade({ children }: PageFadeProps) {
  return (
    <div style={{ animation: "pageFadeIn 0.25s ease both" }}>
      {children}
      <style>{`
        @keyframes pageFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}