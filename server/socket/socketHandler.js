import { createLiveTranscription } from '../services/deepgramService.js';
import { runPipeline } from '../services/claimDetector.js';

// socketId → { dg, retried, closedByUser }
const activeSessions = new Map();
let nextLineId = 1;

export function registerSocketHandlers(io, socket) {
  socket.on('session:start', (payload) => {
    endSession(socket.id); // reset if a session is already running
    // the user's LLM key: memory only, per socket, never logged or persisted
    const llm =
      payload?.provider && payload?.apiKey
        ? { provider: payload.provider, apiKey: payload.apiKey }
        : null;
    startDeepgram(socket, llm);
  });

  socket.on('audio:chunk', (chunk) => {
    activeSessions.get(socket.id)?.dg.send(chunk);
  });

  socket.on('session:end', () => endSession(socket.id));
  socket.on('disconnect', () => endSession(socket.id));
}

function startDeepgram(socket, llm, isRetry = false) {
  const session = { retried: isRetry, closedByUser: false, llm };

  session.dg = createLiveTranscription({
    onTranscript: ({ text, isFinal }) => {
      if (!isFinal) {
        socket.emit('transcript:partial', { text });
        return;
      }
      const lineId = nextLineId++;
      socket.emit('transcript:final', { text, timestamp: Date.now(), lineId });
      runPipeline({ text, lineId, llm: session.llm }, (event, payload) => socket.emit(event, payload));
    },
    onError: (err) => console.error('deepgram error:', err?.message || err),
    onClose: () => {
      const current = activeSessions.get(socket.id);
      if (!current || current.closedByUser) return;
      if (!current.retried) {
        startDeepgram(socket, current.llm, true); // dropped connection — retry once
      } else {
        socket.emit('error:stt', { message: 'Speech-to-text connection lost. End the session and try again.' });
        activeSessions.delete(socket.id);
      }
    },
  });

  activeSessions.set(socket.id, session);
}

function endSession(socketId) {
  const session = activeSessions.get(socketId);
  if (!session) return;
  session.closedByUser = true;
  session.dg.close();
  activeSessions.delete(socketId);
}
