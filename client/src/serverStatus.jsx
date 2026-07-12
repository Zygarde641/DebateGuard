import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { SERVER_URL } from './config';

// Pings the backend on site load to wake a sleeping free-tier server, and
// exposes the status so the UI can say "waking up…" then "ready to debate".
const Ctx = createContext({ status: 'waking' });
export const useServerStatus = () => useContext(Ctx);

export function ServerStatusProvider({ children }) {
  const [status, setStatus] = useState('waking'); // 'waking' | 'ready'
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // one wake loop per page load
    started.current = true;
    let cancelled = false;

    const ping = async () => {
      if (cancelled) return;
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 10000);
        const res = await fetch(`${SERVER_URL}/api/health`, { signal: ctrl.signal, cache: 'no-store' });
        clearTimeout(timer);
        if (res.ok) {
          if (!cancelled) setStatus('ready');
          return;
        }
      } catch {
        /* still asleep or timed out — retry */
      }
      if (!cancelled) setTimeout(ping, 3000);
    };
    ping();

    return () => {
      cancelled = true;
    };
  }, []);

  return <Ctx.Provider value={{ status }}>{children}</Ctx.Provider>;
}

// Thin top banner: "waking up…" while cold, a brief "ready to debate", then hides.
export function ServerStatusBanner() {
  const { status } = useServerStatus();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (status === 'ready') {
      const t = setTimeout(() => setHidden(true), 4000);
      return () => clearTimeout(t);
    }
  }, [status]);

  if (hidden) return null;

  const ready = status === 'ready';
  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full px-4 py-2 text-center text-sm font-medium ${
        ready ? 'bg-true/15 text-true' : 'bg-primary/15 text-primary'
      }`}
    >
      {ready ? (
        <span>✅ Server’s awake — ready to debate.</span>
      ) : (
        <span>
          <span className="mr-2 inline-block animate-spin">◔</span>
          Waking the server… the free tier sleeps when idle, so this first load can take up to a minute. Hang tight.
        </span>
      )}
    </div>
  );
}
