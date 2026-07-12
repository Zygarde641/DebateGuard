import Anthropic from '@anthropic-ai/sdk';

// llm = { provider: 'claude' | 'openai' | 'gemini', apiKey: string }
// Keys come from the user via the UI, live only in server memory for the session,
// and are never logged or persisted.

export const PROVIDERS = ['claude', 'openai', 'gemini'];

// Latency-critical scan uses each provider's fastest model; the web-search
// fact-check keeps the stronger model.
const CLAUDE_SCAN_MODEL = 'claude-haiku-4-5';
const CLAUDE_FACT_MODEL = 'claude-sonnet-5';
const OPENAI_MODEL = 'gpt-4o-mini';
const OPENAI_SEARCH_MODEL = 'gpt-4o-mini-search-preview';
const GEMINI_MODEL = 'gemini-flash-latest';

const SCAN_TIMEOUT_MS = 15_000; // a scan slower than this is broken — fail fast
const FACT_TIMEOUT_MS = 60_000; // per attempt; the pipeline retries slow fact-checks in the background

const SCAN_SYSTEM =
  'You are a real-time debate analyst. In one fast pass over a spoken sentence: (1) decide if it contains a verifiable factual claim (opinions, questions, greetings and filler are not checkable); (2) name any logical fallacies actually present, using standard names (Strawman, Ad Hominem, False Dichotomy, Slippery Slope, Cherry Picking, Whataboutism, Appeal to Emotion, ...). Be decisive and terse — one short explanation sentence per fallacy.';

const SCAN_JSON_INSTRUCTIONS =
  'Return ONLY a JSON object, no other text: {"isCheckable": boolean, "extractedClaim": string, "fallacies": [{"name": string, "explanation": string}], "confidence": number}. "extractedClaim" is the claim restated as a standalone checkable sentence, or "" if none. "fallacies" is [] if none. "confidence" (0-1) is your confidence in the fallacy judgment.';

const SCAN_SCHEMA = {
  type: 'object',
  properties: {
    isCheckable: { type: 'boolean' },
    extractedClaim: { type: 'string' },
    fallacies: {
      type: 'array',
      items: {
        type: 'object',
        properties: { name: { type: 'string' }, explanation: { type: 'string' } },
        required: ['name', 'explanation'],
        additionalProperties: false,
      },
    },
    confidence: { type: 'number' },
  },
  required: ['isCheckable', 'extractedClaim', 'fallacies', 'confidence'],
  additionalProperties: false,
};

const FACT_CHECK_SYSTEM = `You are a professional fact-checker on a live broadcast — speed matters. Verify the claim (use web search if available; at most 2 quick searches). Return ONLY a valid JSON object with no extra text, exactly this shape:
{
  "verdict": "TRUE" | "FALSE" | "MISLEADING",
  "correction": string,
  "sourceUrl": string,
  "sourceName": string,
  "confidence": number
}
Rules: "correction" is the accurate fact in 1-2 sentences when the verdict is FALSE or MISLEADING, otherwise "". "confidence" is 0.0-1.0. Cite the single most authoritative source you found.`;

// ---------- public API ----------

// Stage 1 — fast scan: checkable claim? fallacies? No web search, fastest models,
// so fallacy alerts can fire within seconds of the sentence being spoken.
export async function scanUtterance(llm, sentence) {
  const user = `Sentence: "${sentence}"`;
  switch (llm.provider) {
    case 'claude': {
      const resp = await claudeCreate(claudeClient(llm, SCAN_TIMEOUT_MS), {
        model: CLAUDE_SCAN_MODEL,
        max_tokens: 500,
        output_config: { format: { type: 'json_schema', schema: SCAN_SCHEMA } },
        system: SCAN_SYSTEM,
        messages: [{ role: 'user', content: user }],
      });
      return extractJson(textOfClaude(resp));
    }
    case 'openai': {
      const text = await openaiChat(
        llm.apiKey,
        {
          model: OPENAI_MODEL,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: `${SCAN_SYSTEM}\n${SCAN_JSON_INSTRUCTIONS}` },
            { role: 'user', content: user },
          ],
        },
        SCAN_TIMEOUT_MS,
      );
      return extractJson(text);
    }
    case 'gemini': {
      const text = await geminiGenerate(
        llm.apiKey,
        {
          systemInstruction: { parts: [{ text: `${SCAN_SYSTEM}\n${SCAN_JSON_INSTRUCTIONS}` }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            // Gemini flash thinks by default, adding seconds — turn it off for the scan
            thinkingConfig: { thinkingBudget: 0 },
          },
        },
        SCAN_TIMEOUT_MS,
      );
      return extractJson(text);
    }
    default:
      throw new Error(`Unknown provider: ${llm.provider}`);
  }
}

// Stage 2 — fact-check with web search where the provider supports it.
// Fallacies are already handled by the scan; this is verdict/correction only.
export async function factCheck(llm, claim) {
  const user = `Fact-check this debate statement: "${claim}"`;
  switch (llm.provider) {
    case 'claude':
      return extractJson(await claudeFactCheck(llm, user));
    case 'openai': {
      const messages = [
        { role: 'system', content: FACT_CHECK_SYSTEM },
        { role: 'user', content: user },
      ];
      let text;
      try {
        text = await openaiChat(
          llm.apiKey,
          { model: OPENAI_SEARCH_MODEL, web_search_options: {}, messages },
          FACT_TIMEOUT_MS,
        );
      } catch (err) {
        if (isAuthError(err)) throw err;
        // search model unavailable on this account — fall back to plain model
        text = await openaiChat(llm.apiKey, { model: OPENAI_MODEL, messages }, FACT_TIMEOUT_MS);
      }
      return extractJson(text);
    }
    case 'gemini': {
      const body = {
        systemInstruction: { parts: [{ text: FACT_CHECK_SYSTEM }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { thinkingConfig: { thinkingBudget: 0 } },
      };
      let text;
      try {
        text = await geminiGenerate(llm.apiKey, { ...body, tools: [{ google_search: {} }] }, FACT_TIMEOUT_MS);
      } catch (err) {
        if (isAuthError(err)) throw err;
        text = await geminiGenerate(llm.apiKey, body, FACT_TIMEOUT_MS); // grounding unavailable — answer without it
      }
      return extractJson(text);
    }
    default:
      throw new Error(`Unknown provider: ${llm.provider}`);
  }
}

export function friendlyError(err) {
  const msg = String(err?.message || err);
  if (/401|403|invalid.?api.?key|api.?key.?not.?valid|API_KEY_INVALID|unauthorized|permission|authentication/i.test(msg)) {
    return 'Your API key was rejected by the provider. Check the key and try again.';
  }
  if (isQuotaExhausted(err)) {
    return 'This key’s daily free-tier quota is used up — it resets tomorrow. Switch provider or key to keep checking today.';
  }
  if (/429|rate.?limit|quota|resource.?exhausted/i.test(msg)) {
    return 'The AI provider is rate-limiting your key. Analysis will keep retrying.';
  }
  if (/timeout|timed?.?out|abort/i.test(msg)) {
    return 'The AI provider is responding slowly right now — that check was skipped.';
  }
  return 'AI analysis failed — see the server log for details.';
}

export function isAuthError(err) {
  return /401|403|invalid.?api.?key|api.?key.?not.?valid|API_KEY_INVALID|unauthorized|authentication/i.test(
    String(err?.message || err),
  );
}

// a spent per-DAY quota (e.g. Gemini free tier: 20 req/day) won't recover for hours —
// retrying it is pure waste, so the pipeline stops instead
export function isQuotaExhausted(err) {
  const msg = String(err?.message || err);
  return /429|RESOURCE_EXHAUSTED/i.test(msg) && /PerDay|per.?day|daily/i.test(msg);
}

// ---------- Claude ----------

function claudeClient(llm, timeout) {
  return new Anthropic({ apiKey: llm.apiKey, timeout, maxRetries: 1 });
}

async function claudeCreate(client, params) {
  await waitTurn();
  try {
    return await client.messages.create(params);
  } catch (err) {
    if (err?.status === 429) tripLimiter(retryDelayMs(err.headers, ''));
    throw err;
  }
}

async function claudeFactCheck(llm, user) {
  const client = claudeClient(llm, FACT_TIMEOUT_MS);
  const base = {
    model: CLAUDE_FACT_MODEL,
    max_tokens: 1000,
    output_config: { effort: 'low' },
    tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 2 }],
    system: FACT_CHECK_SYSTEM,
  };
  let messages = [{ role: 'user', content: user }];
  let resp = await claudeCreate(client, { ...base, messages });

  // the server-side search loop can pause mid-turn; resume up to 2 times
  for (let i = 0; i < 2 && resp.stop_reason === 'pause_turn'; i++) {
    messages = [...messages, { role: 'assistant', content: resp.content }];
    resp = await claudeCreate(client, { ...base, messages });
  }
  return textOfClaude(resp);
}

function textOfClaude(resp) {
  return resp.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
}

// ---------- OpenAI ----------

async function openaiChat(apiKey, body, timeoutMs) {
  await waitTurn();
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const errText = await res.text();
    if (res.status === 429) tripLimiter(retryDelayMs(res.headers, errText));
    throw new Error(`OpenAI ${res.status}: ${errText.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

// ---------- Gemini ----------

async function geminiGenerate(apiKey, body, timeoutMs) {
  await waitTurn();
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    },
  );
  if (!res.ok) {
    const errText = await res.text();
    if (res.status === 429) tripLimiter(retryDelayMs(res.headers, errText));
    // thinkingConfig support varies as the "-latest" alias moves — retry once without it
    if (res.status === 400 && body.generationConfig?.thinkingConfig && /thinking/i.test(errText)) {
      const { thinkingConfig, ...rest } = body.generationConfig;
      return geminiGenerate(apiKey, { ...body, generationConfig: rest }, timeoutMs);
    }
    throw new Error(`Gemini ${res.status}: ${errText.slice(0, 600)}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
}

// ---------- adaptive rate limiting ----------
// Full speed until a provider returns 429; then honor its requested cooldown and
// space subsequent requests (~13s apart ≈ 4.6/min — under Gemini's 5 RPM free tier)
// until it has been quiet for 5 minutes.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const limiter = { nextAt: 0, minGapMs: 0, trippedAt: 0 };

async function waitTurn() {
  if (limiter.minGapMs && Date.now() - limiter.trippedAt > 5 * 60_000) limiter.minGapMs = 0;
  const now = Date.now();
  const start = Math.max(now, limiter.nextAt);
  limiter.nextAt = start + limiter.minGapMs; // queued callers serialize with spacing
  if (start > now) await sleep(start - now);
}

function tripLimiter(cooldownMs) {
  limiter.trippedAt = Date.now();
  limiter.minGapMs = Math.max(limiter.minGapMs, 13_000);
  limiter.nextAt = Math.max(limiter.nextAt, Date.now() + cooldownMs);
}

// how long the provider asked us to back off (retry-after header, Gemini retryDelay, or 30s),
// capped at 2 min so a daily-quota 429 can't park the queue for hours
function retryDelayMs(headers, bodyText) {
  const h = Number(headers?.get?.('retry-after'));
  if (h > 0) return Math.min(h * 1000, 120_000);
  const m = /retryDelay"?\s*:\s*"?([\d.]+)s/.exec(bodyText || '');
  if (m) return Math.min(Math.ceil(parseFloat(m[1]) * 1000), 120_000);
  return 30_000;
}

// ---------- shared ----------

// responses may interleave citations/prose with the JSON — pull out the object
function extractJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}
