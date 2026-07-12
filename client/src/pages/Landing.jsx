import { Link } from 'react-router-dom';
import { useServerStatus } from '../serverStatus.jsx';

const FEATURES = [
  {
    icon: '✅',
    title: 'Fact Checking',
    text: 'Every completed statement is verified against live web sources by Claude — verdicts arrive in seconds, with citations.',
  },
  {
    icon: '🧠',
    title: 'Fallacy Detection',
    text: '21 logical fallacies detected in real time — from Strawman to Gish Gallop — each explained as it happens.',
  },
  {
    icon: '🔔',
    title: 'Instant Alerts',
    text: 'A calm, authoritative ding the moment something false is said, with a sourced correction card on screen.',
  },
];

export default function Landing() {
  const { status } = useServerStatus();
  const ready = status === 'ready';
  return (
    <div className="min-h-screen bg-bg">
      <section className="flex min-h-[85vh] flex-col items-center justify-center px-6 text-center">
        <div className="animate-mic-pulse mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-primary/15 text-5xl ring-2 ring-primary/40">
          🎙️
        </div>
        <h1 className="max-w-3xl text-5xl font-extrabold leading-tight md:text-6xl">
          Truth Has a Sound. <span className="inline-block">🔔</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted">
          Real-time AI fact-checking and fallacy detection for debates, panels, and arguments.
        </p>
        {ready ? (
          <Link
            to="/session"
            className="mt-10 rounded-xl bg-primary px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-primary/25 hover:bg-primary/90 transition-colors duration-300"
          >
            Ready to debate — Start a Session
          </Link>
        ) : (
          <button
            disabled
            aria-busy="true"
            className="mt-10 flex items-center gap-3 rounded-xl bg-primary/40 px-8 py-4 text-lg font-semibold text-white/80 cursor-wait"
          >
            <span className="inline-block animate-spin">◔</span>
            Waking the server… please wait
          </button>
        )}
        <Link to="/fallacies" className="mt-4 text-sm text-muted hover:text-primary transition-colors duration-300">
          Browse the fallacy guide →
        </Link>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-6 pb-24 md:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-xl bg-surface border border-white/5 p-6">
            <div className="text-3xl">{f.icon}</div>
            <h3 className="mt-3 text-lg font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{f.text}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-white/5 py-6 text-center text-xs text-muted">
        DebateGuard AI — bring your own AI key (Claude, ChatGPT or Gemini). No accounts, no database, nothing stored.
      </footer>
    </div>
  );
}
