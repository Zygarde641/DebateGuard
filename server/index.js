import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// LLM keys are supplied by the user in the UI; only Deepgram is server-configured.
if (!process.env.DEEPGRAM_API_KEY) {
  console.warn('[warn] DEEPGRAM_API_KEY is not set — add it to .env (transcription will not work)');
}

// import after dotenv so services see the env vars
const { default: apiRoutes } = await import('./routes/analyze.js');
const { registerSocketHandlers } = await import('./socket/socketHandler.js');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', apiRoutes);

// serve the built client in production, if present
const dist = path.resolve(__dirname, '../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api|socket\.io).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
} else {
  // backend-only deploy (e.g. Render): the website lives on the frontend host (Vercel)
  app.get('/', (req, res) =>
    res
      .type('html')
      .send(
        '<div style="font-family:system-ui;max-width:34rem;margin:4rem auto;text-align:center;color:#e2e8f0;background:#0d1117;padding:2rem;border-radius:12px">' +
          '<h1>🎙️ DebateGuard API is running</h1>' +
          '<p style="color:#718096">This is the backend service. Open the app on your frontend host (e.g. your Vercel URL), not here.</p>' +
          '<p><a style="color:#6c63ff" href="/api/health">/api/health</a></p>' +
          '</div>',
      ),
  );
}

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
io.on('connection', (socket) => registerSocketHandlers(io, socket));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`DebateGuard server listening on :${PORT}`));
