import { scanUtterance, factCheck, friendlyError, isAuthError, isQuotaExhausted } from './llmService.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Two-stage pipeline, tuned for latency:
//   stage 1 (fast scan) detects fallacies itself and alerts IMMEDIATELY — no web search;
//   stage 2 (web fact-check) runs only for checkable claims and alerts on FALSE/MISLEADING.
// The client applies the confidence >= 0.7 gate (ding + card vs. muted ⚠️ chip).
export async function runPipeline({ text, lineId, llm }, emit) {
  if (!llm?.apiKey) return; // no key, transcript-only mode
  if (text.trim().split(/\s+/).length < 3) return; // filler — not worth a token

  let scan;
  try {
    scan = await scanUtterance(llm, text);
  } catch (err) {
    console.error('utterance scan failed:', err.message);
    emit('error:llm', { message: friendlyError(err) });
    return;
  }
  if (!scan) return;

  const fallacies = Array.isArray(scan.fallacies) ? scan.fallacies : [];
  if (fallacies.length > 0) {
    // fallacies are structural — no web search needed, alert right now
    emit('alert:trigger', {
      verdict: 'FALLACY',
      correction: '',
      sourceUrl: '',
      sourceName: '',
      confidence: typeof scan.confidence === 'number' ? scan.confidence : 0.75,
      fallacies,
      originalClaim: text,
      lineId,
    });
  }

  if (!scan.isCheckable) return;

  const claim = scan.extractedClaim || text;
  emit('claim:detected', { claimText: claim, lineId });

  // keep the slow web search running in the background — retry instead of skipping,
  // so the verdict card just arrives late rather than never
  let result = null;
  for (let attempt = 1; attempt <= 3 && !result; attempt++) {
    try {
      result = await factCheck(llm, claim);
    } catch (err) {
      if (isAuthError(err) || isQuotaExhausted(err)) {
        // bad key or spent daily quota — retrying is pure waste
        emit('error:llm', { message: friendlyError(err) });
        emit('claim:cleared', { lineId, resolved: false });
        return;
      }
      console.error(`fact-check attempt ${attempt}/3 failed:`, err.message);
      if (attempt < 3) await sleep(2000 * attempt);
    }
  }
  if (!result) {
    emit('claim:cleared', { lineId, resolved: false }); // gave up — mark line ⚠️ unverified
    return;
  }

  if (result.verdict === 'FALSE' || result.verdict === 'MISLEADING') {
    emit('alert:trigger', {
      verdict: result.verdict,
      correction: result.correction || '',
      sourceUrl: result.sourceUrl || '',
      sourceName: result.sourceName || '',
      confidence: typeof result.confidence === 'number' ? result.confidence : 0,
      fallacies: [],
      originalClaim: claim,
      lineId,
    });
  } else {
    emit('claim:cleared', { lineId, resolved: true }); // claim checked out — drop the "checking…" chip
  }
}
