import { useState, useEffect } from 'react';

export default function SessionTimer({ startedAt, running }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt || !running) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startedAt, running]);

  const pad = (n) => String(n).padStart(2, '0');
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;

  return (
    <span className="font-mono text-sm text-muted tabular-nums">
      {pad(h)}:{pad(m)}:{pad(s)}
    </span>
  );
}
