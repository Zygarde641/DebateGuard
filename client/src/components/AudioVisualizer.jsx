import { useRef, useEffect } from 'react';

// Reads levelRef via rAF — no React state churn per audio frame.
export default function AudioVisualizer({ levelRef, active }) {
  const barRef = useRef(null);

  useEffect(() => {
    let raf;
    const tick = () => {
      if (barRef.current) {
        const pct = active ? Math.round(levelRef.current * 100) : 0;
        barRef.current.style.width = `${pct}%`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [levelRef, active]);

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted shrink-0">🎙 Mic level</span>
      <div className="h-2 flex-1 rounded-full bg-surface overflow-hidden">
        <div
          ref={barRef}
          className="h-full rounded-full bg-gradient-to-r from-primary to-true transition-[width] duration-100"
          style={{ width: '0%' }}
        />
      </div>
    </div>
  );
}
