import { useState } from 'react';
import { Link } from 'react-router-dom';

const PROVIDERS = [
  { id: 'claude', label: 'Claude', vendor: 'Anthropic', keyUrl: 'https://platform.claude.com/', hint: 'sk-ant-...' },
  { id: 'openai', label: 'ChatGPT', vendor: 'OpenAI', keyUrl: 'https://platform.openai.com/api-keys', hint: 'sk-...' },
  { id: 'gemini', label: 'Gemini', vendor: 'Google', keyUrl: 'https://aistudio.google.com/apikey', hint: 'AIza...' },
];

export default function ApiKeySetup({ onStart }) {
  const [provider, setProvider] = useState(() => localStorage.getItem('llmProvider') || 'claude');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('llmApiKey') || '');
  const selected = PROVIDERS.find((p) => p.id === provider);

  const submit = (e) => {
    e.preventDefault();
    const key = apiKey.trim();
    if (!key) return;
    localStorage.setItem('llmProvider', provider);
    localStorage.setItem('llmApiKey', key);
    onStart({ provider, apiKey: key });
  };

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-surface border border-white/5 p-8">
        <h2 className="text-xl font-bold">Connect your AI</h2>
        <p className="mt-2 text-sm text-muted">
          DebateGuard uses <span className="text-body">your</span> AI account to fact-check. Pick a provider and paste
          your API key — it stays in this browser and is only used for this session’s checks.
        </p>

        <div className="mt-6 grid grid-cols-3 gap-2" role="radiogroup" aria-label="AI provider">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={provider === p.id}
              onClick={() => setProvider(p.id)}
              className={`rounded-xl border px-3 py-3 text-sm font-medium transition-colors duration-300 ${
                provider === p.id
                  ? 'border-primary bg-primary/15 text-body'
                  : 'border-white/10 text-muted hover:border-white/25'
              }`}
            >
              {p.label}
              <span className="block text-[10px] font-normal text-muted">{p.vendor}</span>
            </button>
          ))}
        </div>

        <label className="mt-5 block text-xs font-semibold uppercase tracking-wider text-muted" htmlFor="api-key">
          {selected.label} API key
        </label>
        <input
          id="api-key"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={selected.hint}
          autoComplete="off"
          className="mt-2 w-full rounded-xl border border-white/10 bg-bg px-4 py-3 text-sm outline-none focus:border-primary"
        />
        <a
          href={selected.keyUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-xs text-primary hover:underline"
        >
          Get a {selected.label} API key ↗
        </a>

        <button
          type="submit"
          disabled={!apiKey.trim()}
          className="mt-6 w-full rounded-xl bg-primary py-3 font-semibold text-white transition-colors duration-300 hover:bg-primary/90 disabled:opacity-40"
        >
          🎙️ Start Listening
        </button>

        <p className="mt-4 text-center text-[11px] text-muted/70">
          Nothing is stored on the server — key, transcript and alerts vanish when the session ends.{' '}
          <Link to="/" className="text-primary/80 hover:underline">Back home</Link>
        </p>
      </form>
    </div>
  );
}
