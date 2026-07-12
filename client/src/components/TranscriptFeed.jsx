import { useRef, useEffect } from 'react';

export default function TranscriptFeed({ lines, partial, listening }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines, partial]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted shrink-0">Live Transcript</h2>
      <div className="min-h-0 flex-1 overflow-y-auto pr-2">
        {lines.length === 0 && !partial && (
          <p className="text-sm text-muted">
            {listening ? 'Start talking — every word you say appears here as it’s heard.' : 'Waiting for the microphone…'}
          </p>
        )}
        <div className="space-y-3">
          {lines.map((line) => {
            const falseClaim = line.verdict === 'FALSE' || line.verdict === 'MISLEADING';
            return (
              <div key={line.lineId} className={`animate-fade-in ${falseClaim ? 'border-l-2 border-false/70 pl-3 -ml-3.5' : ''}`}>
                <span className="mr-2 text-xs font-semibold text-primary">[{line.speaker}]</span>
                <span
                  className={`text-sm leading-relaxed ${
                    line.hasFallacy
                      ? 'rounded bg-false/20 px-1 -mx-1 text-red-200 box-decoration-clone'
                      : ''
                  }`}
                >
                  {line.text}
                </span>
                {line.hasFallacy && line.fallacyNames?.length > 0 && (
                  <span className="ml-2 text-[11px] font-semibold text-false">
                    ⚠ {line.fallacyNames.join(', ')}
                  </span>
                )}
                {line.status === 'checking' && (
                  <span className="ml-2 animate-pulse text-[11px] text-muted">checking…</span>
                )}
                {line.status === 'unverified' && (
                  <span className="ml-2 rounded bg-muted/15 px-1.5 py-0.5 text-[11px] text-muted">⚠️ unverified</span>
                )}
              </div>
            );
          })}
          {partial && (
            <div className="opacity-60">
              <span className="mr-2 text-xs font-semibold text-primary">[{partial.speaker}]</span>
              <span className="text-sm italic">{partial.text}</span>
              <span className="ml-1 animate-pulse text-primary">▌</span>
            </div>
          )}
          {!partial && listening && lines.length > 0 && (
            <p className="animate-pulse text-xs text-muted/60">🎧 listening…</p>
          )}
        </div>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
