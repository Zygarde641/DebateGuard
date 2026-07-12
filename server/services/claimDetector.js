import { filterClaim, factCheck, friendlyError } from './llmService.js';

// Two-stage pipeline: cheap classifier first, fact-check only when it flags.
// The client applies the confidence >= 0.7 gate (ding + card vs. muted ⚠️ chip).
export async function runPipeline({ text, lineId, llm }, emit) {
  if (!llm?.apiKey) return; // no key, transcript-only mode
  if (text.trim().split(/\s+/).length < 3) return; // filler — not worth a token

  let filter;
  try {
    filter = await filterClaim(llm, text);
  } catch (err) {
    console.error('claim filter failed:', err.message);
    emit('error:llm', { message: friendlyError(err) });
    return;
  }
  if (!filter || (!filter.isCheckable && !filter.hasFallacy)) return;

  const claim = filter.extractedClaim || text;
  emit('claim:detected', { claimText: claim, lineId });

  let result;
  try {
    result = await factCheck(llm, claim);
  } catch (err) {
    console.error('fact-check failed:', err.message);
    emit('error:llm', { message: friendlyError(err) });
    return;
  }
  if (!result) return;

  const flagged =
    result.verdict === 'FALSE' ||
    result.verdict === 'MISLEADING' ||
    (result.fallacies?.length ?? 0) > 0;
  if (!flagged) return;

  emit('alert:trigger', {
    verdict: result.verdict,
    correction: result.correction || '',
    sourceUrl: result.sourceUrl || '',
    sourceName: result.sourceName || '',
    confidence: typeof result.confidence === 'number' ? result.confidence : 0,
    fallacies: result.fallacies || [],
    originalClaim: claim,
    lineId,
  });
}
