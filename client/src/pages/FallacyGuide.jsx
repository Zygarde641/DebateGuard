import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SERVER_URL } from '../config';

const CATEGORY_STYLES = {
  Rhetoric: 'border-l-purple-500',
  Evidence: 'border-l-blue-500',
  Relevance: 'border-l-fallacy',
};

export default function FallacyGuide() {
  const [fallacies, setFallacies] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${SERVER_URL}/api/fallacies`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))))
      .then(setFallacies)
      .catch(() => setError('Could not load the fallacy guide — is the server running?'));
  }, []);

  return (
    <div className="min-h-screen bg-bg px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link to="/" className="text-sm text-muted hover:text-primary transition-colors duration-300">
              ← DebateGuard AI
            </Link>
            <h1 className="mt-2 text-4xl font-extrabold">The Fallacy Guide</h1>
            <p className="mt-2 max-w-xl text-muted">
              All 21 fallacy types DebateGuard detects — what they are, what they sound like, and how to counter them.
            </p>
          </div>
          <Link
            to="/session"
            className="rounded-xl bg-primary px-6 py-3 font-semibold text-white hover:bg-primary/90 transition-colors duration-300"
          >
            Start a Session
          </Link>
        </header>

        <div className="mb-6 flex gap-4 text-xs text-muted">
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-purple-500" />Rhetoric</span>
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-blue-500" />Evidence</span>
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-fallacy" />Relevance</span>
        </div>

        {error && <p className="text-false">{error}</p>}

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {fallacies.map((f, i) => (
            <div
              key={f.name}
              className={`animate-rise rounded-xl border-l-4 border border-white/5 bg-surface/70 p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-white/15 hover:shadow-[0_20px_50px_-20px] hover:shadow-primary/25 ${CATEGORY_STYLES[f.category] ?? ''}`}
              style={{ '--d': `${Math.min(i * 0.05, 0.8)}s` }}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold">{f.name}</h3>
                <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted">{f.category}</span>
              </div>
              <p className="mt-2 text-sm text-body/90">{f.definition}</p>
              <p className="mt-3 text-sm italic text-muted">{f.example}</p>
              <p className="mt-3 text-xs leading-relaxed text-true">
                <span className="font-semibold">Counter:</span> {f.counter}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
