/**
 * PageFade — pure CSS keyframe fade-in on mount.
 * No framer-motion involved, so it never conflicts with in-page animations.
 */
export default function PageFade({ children }) {
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