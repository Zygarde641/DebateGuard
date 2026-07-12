import VerdictCard from './VerdictCard.jsx';

export default function AlertPanel({ currentAlert, alerts, taxonomy = [] }) {
  const history = alerts.filter((a) => a !== currentAlert);

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted shrink-0">Alert Panel</h2>

      {currentAlert ? (
        <div className="shrink-0 max-h-[60%] overflow-y-auto">
          <VerdictCard
            key={`${currentAlert.lineId}-${currentAlert.verdict}`}
            alert={currentAlert}
            taxonomy={taxonomy}
            fresh
          />
        </div>
      ) : (
        <div className="shrink-0 rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-muted">
          Listening… when something false or fallacious is said, a ding fires and the explanation lands here. 🔔
        </div>
      )}

      {history.length > 0 && (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted/70">
            Claim history — this session
          </p>
          <div className="space-y-3">
            {history.map((a, i) => (
              <VerdictCard key={i} alert={a} compact />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
