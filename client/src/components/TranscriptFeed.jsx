import { useRef, useEffect, Fragment } from 'react';

// One utterance = one inline span in the flowing paragraph.
// fallacy → red highlight; FALSE/MISLEADING → red underline; checking → dotted underline.
function Utterance({ line }) {
  const falseClaim = line.verdict === 'FALSE' || line.verdict === 'MISLEADING';
  let cls = 'animate-fade-in';
  if (line.hasFallacy) {
    cls += ' rounded bg-false/20 px-1 text-red-200 box-decoration-clone';
  } else if (falseClaim) {
    cls += ' underline decoration-false decoration-2 underline-offset-4';
  } else if (line.status === 'checking') {
    cls += ' underline decoration-dotted decoration-muted/60 underline-offset-4';
  }
  return (
    <Fragment>
      <span className={cls}>{line.text}</span>
      {line.hasFallacy && line.fallacyNames?.length > 0 && (
        <span className="mx-1.5 inline-block -translate-y-0.5 rounded border border-false/40 bg-false/15 px-1.5 py-0.5 align-middle text-[10px] font-semibold leading-none text-false">
          ⚠ {line.fallacyNames.join(', ')}
        </span>
      )}
      {line.status === 'unverified' && (
        <span className="mx-1 align-middle text-[10px] text-muted">⚠️&thinsp;unverified</span>
      )}{' '}
    </Fragment>
  );
}

export default function TranscriptFeed({ lines, partial, listening }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines, partial]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <h2 className="mb-4 shrink-0 text-xs font-semibold uppercase tracking-widest text-muted">Live Transcript</h2>
      <div className="min-h-0 flex-1 overflow-y-auto pr-2">
        {lines.length === 0 && !partial && (
          <p className="text-sm text-muted">
            {listening ? 'Start talking — every word you say appears here as it’s heard.' : 'Waiting for the microphone…'}
          </p>
        )}
        <p className="text-[15px] leading-8 text-body/90">
          {lines.map((line) => (
            <Utterance key={line.lineId} line={line} />
          ))}
          {partial && <span className="italic text-muted">{partial.text}</span>}
          {listening && (lines.length > 0 || partial) && (
            <span className="ml-0.5 inline-block animate-pulse text-primary">▌</span>
          )}
        </p>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
