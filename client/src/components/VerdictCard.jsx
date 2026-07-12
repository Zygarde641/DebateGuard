import FallacyBadge from './FallacyBadge.jsx';

const VERDICTS = {
  TRUE: { emoji: '🟢', label: 'TRUE', color: 'text-true border-true/50 bg-true/10' },
  MISLEADING: { emoji: '🟡', label: 'MISLEADING', color: 'text-misleading border-misleading/50 bg-misleading/10' },
  FALSE: { emoji: '🔴', label: 'FALSE', color: 'text-false border-false/50 bg-false/10' },
};

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z]/g, '');

// fuzzy match model-reported fallacy names ("Strawman") to the taxonomy ("Strawman Argument")
function lookupFallacy(taxonomy, f) {
  const key = norm(f.name || f.type);
  if (!key) return null;
  return taxonomy.find((t) => {
    const tn = norm(t.name);
    return tn.includes(key) || key.includes(tn);
  });
}

export default function VerdictCard({ alert, taxonomy = [], fresh = false, compact = false }) {
  const onlyFallacy = !VERDICTS[alert.verdict] || (alert.verdict === 'TRUE' && alert.fallacies.length > 0);
  const badge =
    alert.fallacies.length > 0 && onlyFallacy
      ? { emoji: '🟠', label: 'FALLACY', color: 'text-fallacy border-fallacy/50 bg-fallacy/10' }
      : VERDICTS[alert.verdict] ?? VERDICTS.MISLEADING;

  return (
    <div
      className={`rounded-xl bg-surface border border-white/5 p-4 ${
        fresh ? 'animate-slide-in animate-alert-pulse' : ''
      } ${compact ? 'p-3' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold ${badge.color}`}>
          {badge.emoji} {badge.label}
        </span>
        <span className="text-xs text-muted">{alert.speaker}</span>
      </div>

      <p className="mt-3 text-sm italic text-muted">“{alert.originalClaim}”</p>

      {alert.correction && (
        <p className={`mt-3 text-sm leading-relaxed ${compact ? 'line-clamp-2' : ''}`}>{alert.correction}</p>
      )}

      {alert.sourceUrl && (
        <a
          href={alert.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
        >
          {alert.sourceName || 'Source'} ↗
        </a>
      )}

      {alert.fallacies.length > 0 && (
        <div className="mt-3 space-y-2">
          {alert.fallacies.map((f, i) => {
            const info = compact ? null : lookupFallacy(taxonomy, f);
            return (
              <div key={i} className={compact ? '' : 'rounded-lg bg-bg/50 p-2.5'}>
                <FallacyBadge name={f.name || f.type} />
                {!compact && f.explanation && (
                  <p className="mt-1.5 text-xs leading-relaxed text-body/80">{f.explanation}</p>
                )}
                {info && (
                  <div className="mt-2 border-t border-white/5 pt-2 space-y-1">
                    <p className="text-xs leading-relaxed text-muted">
                      <span className="font-semibold text-body/70">What it is:</span> {info.definition}
                    </p>
                    <p className="text-xs italic leading-relaxed text-muted">
                      <span className="font-semibold not-italic text-body/70">Example:</span> {info.example}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!compact && (
        <p className="mt-3 text-[11px] text-muted/70">Confidence: {Math.round((alert.confidence ?? 0) * 100)}%</p>
      )}
    </div>
  );
}
