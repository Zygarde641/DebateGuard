import { Router } from 'express';
import { factCheck, friendlyError, PROVIDERS } from '../services/llmService.js';
import { FALLACIES } from '../data/fallacies.js';

const router = Router();

router.post('/analyze', async (req, res) => {
  const { claim, provider, apiKey } = req.body ?? {};
  if (!claim || typeof claim !== 'string') {
    return res.status(400).json({ error: 'claim (string) is required' });
  }
  if (!PROVIDERS.includes(provider) || !apiKey) {
    return res.status(400).json({ error: `provider (one of ${PROVIDERS.join(', ')}) and apiKey are required` });
  }
  try {
    const result = await factCheck({ provider, apiKey }, claim);
    if (!result) return res.status(502).json({ error: 'fact-check returned no parseable result' });
    res.json(result);
  } catch (err) {
    console.error('analyze failed:', err.message);
    res.status(500).json({ error: friendlyError(err) });
  }
});

router.get('/fallacies', (req, res) => res.json(FALLACIES));

router.get('/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

export default router;
