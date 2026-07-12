import Anthropic from '@anthropic-ai/sdk';

// llm = { provider: 'claude' | 'openai' | 'gemini', apiKey: string }
// Keys come from the user via the UI, live only in server memory for the session,
// and are never logged or persisted.

export const PROVIDERS = ['claude', 'openai', 'gemini'];

const CLAUDE_MODEL = 'claude-sonnet-5';
const OPENAI_MODEL = 'gpt-4o-mini';
const OPENAI_SEARCH_MODEL = 'gpt-4o-mini-search-preview';
const GEMINI_MODEL = 'gemini-2.5-flash';

const FILTER_SYSTEM =
  'You are a debate claim classifier. Given one spoken sentence from a live debate, decide whether it contains a verifiable factual claim and/or a logical fallacy. Opinions, questions, greetings and filler are not checkable.';

const FILTER_JSON_INSTRUCTIONS =
  'Return ONLY a JSON object, no other text: {"isCheckable": boolean, "extractedClaim": string, "hasFallacy": boolean}. "extractedClaim" is the claim restated as a standalone checkable sentence, or "" if none.';

const FILTER_SCHEMA = {
  type: 'object',
  properties: {
    isCheckable: { type: 'boolean' },
    extractedClaim: { type: 'string' },
    hasFallacy: { type: 'boolean' },
  },
  required: ['isCheckable', 'extractedClaim', 'hasFallacy'],
  additionalProperties: false,
};

const FACT_CHECK_SYSTEM = `You are a professional fact-checker and debate analyst. Verify the claim against reliable sources (use web search if available to you). Return ONLY a valid JSON object with no extra text, exactly this shape:
{
  "verdict": "TRUE" | "FALSE" | "MISLEADING",
  "correction": string,
  "sourceUrl": string,
  "sourceName": string,
  "confidence": number,
  "fallacies": [{ "type": string, "name": string, "explanation": string }]
}
Rules: "correction" is the accurate fact when the verdict is FALSE or MISLEADING, otherwise "". "confidence" is 0.0-1.0. Only list fallacies actually present, using standard names (Strawman, Ad Hominem, False Dichotomy, Cherry Picking, ...). Cite the single most authoritative source you found.`;

// ---------- public API ----------

// Call #1 — fast, cheap claim filter. No web search.
export async function filterClaim(llm, sentence) {
  const user = `Sentence: "${sentence}"`;
  switch (llm.provider) {
    case 'claude': {
      const resp = await claudeClient(llm).messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 300,
        thinking: { type: 'disabled' },
        output_config: { effort: 'low', format: { type: 'json_schema', schema: FILTER_SCHEMA } },
        system: FILTER_SYSTEM,
        messages: [{ role: 'user', content: user }],
      });
      return extractJson(textOfClaude(resp));
    }
    case 'openai': {
      const text = await openaiChat(llm.apiKey, {
        model: OPENAI_MODEL,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: `${FILTER_SYSTEM}\n${FILTER_JSON_INSTRUCTIONS}` },
          { role: 'user', content: user },
        ],
      });
      return extractJson(text);
    }
    case 'gemini': {
      const text = await geminiGenerate(llm.apiKey, {
        systemInstruction: { parts: [{ text: `${FILTER_SYSTEM}\n${FILTER_JSON_INSTRUCTIONS}` }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { responseMimeType: 'application/json' },
      });
      return extractJson(text);
    }
    default:
      throw new Error(`Unknown provider: ${llm.provider}`);
  }
}

// Call #2 — fact-check + fallacy detection, web search where the provider supports it.
export async function factCheck(llm, claim) {
  const user = `Fact-check this debate statement and identify any logical fallacies: "${claim}"`;
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
        text = await openaiChat(llm.apiKey, {
          model: OPENAI_SEARCH_MODEL,
          web_search_options: {},
          messages,
        });
      } catch (err) {
        if (isAuthError(err)) throw err;
        // search model unavailable on this account — fall back to plain model
        text = await openaiChat(llm.apiKey, { model: OPENAI_MODEL, messages });
      }
      return extractJson(text);
    }
    case 'gemini': {
      const body = {
        systemInstruction: { parts: [{ text: FACT_CHECK_SYSTEM }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
      };
      let text;
      try {
        text = await geminiGenerate(llm.apiKey, { ...body, tools: [{ google_search: {} }] });
      } catch (err) {
        if (isAuthError(err)) throw err;
        text = await geminiGenerate(llm.apiKey, body); // grounding unavailable — answer without it
      }
      return extractJson(text);
    }
    default:
      throw new Error(`Unknown provider: ${llm.provider}`);
  }
}

export function friendlyError(err) {
  const msg = String(err?.message || err);
  if (/401|403|invalid.?api.?key|unauthorized|permission|authentication/i.test(msg)) {
    return 'Your API key was rejected by the provider. Check the key and try again.';
  }
  if (/429|rate.?limit|quota|resource.?exhausted/i.test(msg)) {
    return 'The AI provider is rate-limiting your key. Analysis will keep retrying.';
  }
  return 'AI analysis failed — see the server log for details.';
}

export function isAuthError(err) {
  return /401|403|invalid.?api.?key|unauthorized|authentication/i.test(String(err?.message || err));
}

// ---------- Claude ----------

function claudeClient(llm) {
  return new Anthropic({ apiKey: llm.apiKey });
}

async function claudeFactCheck(llm, user) {
  const client = claudeClient(llm);
  const base = {
    model: CLAUDE_MODEL,
    max_tokens: 1500,
    output_config: { effort: 'medium' },
    tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 3 }],
    system: FACT_CHECK_SYSTEM,
  };
  let messages = [{ role: 'user', content: user }];
  let resp = await client.messages.create({ ...base, messages });

  // the server-side search loop can pause mid-turn; resume up to 3 times
  for (let i = 0; i < 3 && resp.stop_reason === 'pause_turn'; i++) {
    messages = [...messages, { role: 'assistant', content: resp.content }];
    resp = await client.messages.create({ ...base, messages });
  }
  return textOfClaude(resp);
}

function textOfClaude(resp) {
  return resp.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
}

// ---------- OpenAI ----------

async function openaiChat(apiKey, body) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

// ---------- Gemini ----------

async function geminiGenerate(apiKey, body) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
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
