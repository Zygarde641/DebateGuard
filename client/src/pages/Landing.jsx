import { Link } from 'react-router-dom';
import { useServerStatus } from '../serverStatus.jsx';
import { useMouseParallax, useTilt } from '../hooks/useFx.js';

const FEATURES = [
  {
    icon: '✅',
    title: 'Fact Checking',
    text: 'Every completed statement is verified against live web sources by your AI — verdicts arrive in seconds, with citations.',
  },
  {
    icon: '🧠',
    title: 'Fallacy Detection',
    text: '21 logical fallacies detected in real time — from Strawman to Gish Gallop — highlighted and explained as they happen.',
  },
  {
    icon: '🔔',
    title: 'Instant Alerts',
    text: 'A calm, authoritative ding the moment something false is said, with a sourced correction card on screen.',
  },
];

function FeatureCard({ icon, title, text, delay }) {
  const ref = useTilt(7);
  return (
    <div
      ref={ref}
      className="tilt animate-rise rounded-2xl border border-white/10 bg-surface/60 p-6 backdrop-blur hover:border-primary/40 hover:shadow-[0_24px_60px_-20px] hover:shadow-primary/40"
      style={{ '--d': delay }}
    >
      <div className="text-3xl" style={{ transform: 'translateZ(30px)' }}>
        {icon}
      </div>
      <h3 className="mt-3 text-lg font-semibold" style={{ transform: 'translateZ(20px)' }}>
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted" style={{ transform: 'translateZ(10px)' }}>
        {text}
      </p>
    </div>
  );
}

const HEADLINE = 'Truth Has a Sound.'.split(' ');

export default function Landing() {
  const heroRef = useMouseParallax();
  const { status } = useServerStatus();
  const ready = status === 'ready';

  return (
    <div className="min-h-screen overflow-hidden bg-bg">
      <section
        ref={heroRef}
        className="relative flex min-h-[88vh] flex-col items-center justify-center px-6 text-center"
      >
        {/* depth 0 — aurora background */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div
            className="plx animate-drift absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-primary/20 blur-[110px]"
            style={{ '--plx': 12 }}
          />
          <div
            className="plx animate-drift absolute -bottom-48 -right-32 h-[30rem] w-[30rem] rounded-full bg-true/10 blur-[110px]"
            style={{ '--plx': 18, animationDelay: '-8s' }}
          />
        </div>

        {/* depth 2 — floating glyphs orbiting the hero */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 text-2xl">
          <span className="plx animate-float absolute left-[16%] top-[26%] opacity-20" style={{ '--plx': 30 }}>⚖️</span>
          <span className="plx animate-float absolute right-[18%] top-[32%] opacity-20" style={{ '--plx': 44, animationDelay: '-2s' }}>🔔</span>
          <span className="plx animate-float absolute bottom-[24%] left-[24%] opacity-15" style={{ '--plx': 36, animationDelay: '-4s' }}>💬</span>
          <span className="plx animate-float absolute bottom-[20%] right-[24%] opacity-15" style={{ '--plx': 24, animationDelay: '-5.5s' }}>🧠</span>
        </div>

        {/* depth 3 — mic emblem with pulse rings */}
        <div className="plx animate-rise relative mb-10" style={{ '--plx': -14, '--d': '0.05s' }}>
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full border border-primary/40"
            style={{ animation: 'ring-pulse 2.6s ease-out infinite' }}
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full border border-primary/30"
            style={{ animation: 'ring-pulse 2.6s ease-out infinite', animationDelay: '1.3s' }}
          />
          <div className="animate-float flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-b from-primary/30 to-primary/5 text-6xl shadow-[0_20px_60px_-15px] shadow-primary/50 ring-1 ring-primary/40 backdrop-blur">
            🎙️
          </div>
        </div>

        {/* depth 4 — headline, word by word */}
        <h1 className="max-w-3xl text-5xl font-extrabold leading-tight md:text-7xl">
          {HEADLINE.map((word, i) => (
            <span key={i} className="animate-rise inline-block" style={{ '--d': `${0.15 + i * 0.09}s` }}>
              {word}&nbsp;
            </span>
          ))}
          <span className="animate-rise inline-block" style={{ '--d': '0.55s' }}>🔔</span>
        </h1>
        <p className="animate-rise mt-6 max-w-xl text-lg text-muted" style={{ '--d': '0.6s' }}>
          Real-time AI fact-checking and fallacy detection for debates, panels, and arguments.
        </p>

        <div className="animate-rise mt-10" style={{ '--d': '0.75s' }}>
          {ready ? (
            <Link
              to="/session"
              className="inline-block rounded-xl bg-primary px-8 py-4 text-lg font-semibold text-white shadow-xl shadow-primary/30 transition-all duration-300 hover:-translate-y-1 hover:bg-primary/90 hover:shadow-primary/50"
            >
              Ready to debate — Start a Session
            </Link>
          ) : (
            <button
              disabled
              aria-busy="true"
              className="flex cursor-wait items-center gap-3 rounded-xl bg-primary/40 px-8 py-4 text-lg font-semibold text-white/80"
            >
              <span className="inline-block animate-spin">◔</span>
              Waking the server… please wait
            </button>
          )}
        </div>
        <Link
          to="/fallacies"
          className="animate-rise mt-4 text-sm text-muted transition-colors duration-300 hover:text-primary"
          style={{ '--d': '0.85s' }}
        >
          Browse the fallacy guide →
        </Link>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-6 pb-24 md:grid-cols-3" style={{ perspective: '1200px' }}>
        {FEATURES.map((f, i) => (
          <FeatureCard key={f.title} {...f} delay={`${0.9 + i * 0.12}s`} />
        ))}
      </section>

      <footer className="border-t border-white/5 py-6 text-center text-xs text-muted">
        DebateGuard AI — bring your own AI key (Claude, ChatGPT or Gemini). No accounts, no database, nothing stored.
      </footer>
    </div>
  );
}
