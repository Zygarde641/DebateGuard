import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import TranscriptFeed from '../components/TranscriptFeed.jsx';
import AlertPanel from '../components/AlertPanel.jsx';
import AudioVisualizer from '../components/AudioVisualizer.jsx';
import SessionTimer from '../components/SessionTimer.jsx';
import ApiKeySetup from '../components/ApiKeySetup.jsx';
import { useAudio } from '../hooks/useAudio.js';
import { useSocket } from '../hooks/useSocket.js';
import { SERVER_URL } from '../config';

export default function SessionRoom() {
  const navigate = useNavigate();
  const { start, stop, playDing, levelRef } = useAudio();
  const { getSocket, closeSocket } = useSocket();

  const [phase, setPhase] = useState('setup'); // 'setup' | 'live'
  const [lines, setLines] = useState([]);
  const [partial, setPartial] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [currentAlert, setCurrentAlert] = useState(null);
  const [taxonomy, setTaxonomy] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('muted') === 'true');
  const [startedAt, setStartedAt] = useState(null);
  const [error, setError] = useState(null);

  const mutedRef = useRef(isMuted);
  mutedRef.current = isMuted;

  // fallacy definitions + examples for the alert cards
  useEffect(() => {
    fetch(`${SERVER_URL}/api/fallacies`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setTaxonomy)
      .catch(() => {});
  }, []);

  // Alert queue: reveal one alert every 2s, never stack two at once.
  const queueRef = useRef([]);
  const revealTimerRef = useRef(null);

  const revealNext = useCallback(() => {
    const next = queueRef.current.shift();
    if (!next) {
      revealTimerRef.current = null;
      return;
    }
    setCurrentAlert(next);
    setAlerts((prev) => [next, ...prev]);
    if (!mutedRef.current) playDing();
    revealTimerRef.current = setTimeout(revealNext, 2000);
  }, [playDing]);

  const enqueueAlert = useCallback(
    (alert) => {
      queueRef.current.push(alert);
      if (!revealTimerRef.current) revealNext();
    },
    [revealNext],
  );

  const updateLine = useCallback((lineId, patch) => {
    setLines((prev) => prev.map((l) => (l.lineId === lineId ? { ...l, ...patch } : l)));
  }, []);

  const beginSession = useCallback(
    async ({ provider, apiKey }) => {
      setError(null);
      setPhase('live');
      const socket = getSocket();

      socket.off(); // clear listeners from any previous run
      socket.on('transcript:partial', (p) => setPartial(p));
      socket.on('transcript:final', (line) => {
        setPartial(null);
        setLines((prev) => [...prev, { ...line, status: null }]);
      });
      socket.on('claim:detected', ({ lineId }) => updateLine(lineId, { status: 'checking' }));
      socket.on('alert:trigger', (alert) => {
        if (alert.confidence >= 0.7) {
          updateLine(alert.lineId, {
            status: 'flagged',
            verdict: alert.verdict,
            hasFallacy: alert.fallacies.length > 0,
            fallacyNames: alert.fallacies.map((f) => f.name || f.type),
          });
          enqueueAlert(alert);
        } else {
          // low confidence: muted chip in the transcript, no ding, no card
          updateLine(alert.lineId, { status: 'unverified' });
        }
      });
      socket.on('error:stt', ({ message }) => setError(message));
      socket.on('error:llm', ({ message }) => setError(message));

      socket.emit('session:start', { provider, apiKey, speakerCount: 2 });
      try {
        await start((chunk) => socket.emit('audio:chunk', chunk));
      } catch {
        setError('Microphone access denied. Allow mic access in your browser and reload this page.');
        return;
      }
      setIsListening(true);
      setStartedAt(Date.now());
    },
    [getSocket, start, enqueueAlert, updateLine],
  );

  const tornDownRef = useRef(false);
  const teardown = useCallback(() => {
    if (tornDownRef.current) return;
    tornDownRef.current = true;
    stop();
    clearTimeout(revealTimerRef.current);
    revealTimerRef.current = null;
    queueRef.current = [];
    getSocket().emit('session:end', {});
  }, [stop, getSocket]);

  useEffect(() => {
    return () => {
      teardown();
      closeSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const endSession = () => {
    teardown();
    closeSocket();
    navigate('/');
  };

  const changeKey = () => {
    teardown();
    closeSocket();
    tornDownRef.current = false;
    setIsListening(false);
    setStartedAt(null);
    setLines([]);
    setPartial(null);
    setAlerts([]);
    setCurrentAlert(null);
    setError(null);
    setPhase('setup');
  };

  const toggleMute = () => {
    setIsMuted((m) => {
      localStorage.setItem('muted', String(!m));
      return !m;
    });
  };

  // Keyboard shortcut: M toggles mute
  useEffect(() => {
    const onKey = (e) => {
      if (e.key.toLowerCase() === 'm' && !e.metaKey && !e.ctrlKey && e.target.tagName !== 'INPUT') toggleMute();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex h-screen flex-col bg-bg">
      {/* Top bar */}
      <header className="flex shrink-0 items-center justify-between border-b border-white/5 px-5 py-3">
        <Link to="/" className="flex items-center gap-2 font-bold">
          <span className={isListening ? 'animate-mic-pulse' : ''}>🎙️</span>
          <span>
            DebateGuard <span className="text-primary">AI</span>
          </span>
        </Link>
        <div className="flex items-center gap-4">
          {phase === 'live' && (
            <>
              <span className="hidden items-center gap-1.5 text-xs text-muted sm:flex">
                <span className={`h-2 w-2 rounded-full ${isListening ? 'bg-true animate-pulse' : 'bg-muted'}`} />
                {isListening ? 'Listening' : 'Idle'}
              </span>
              <SessionTimer startedAt={startedAt} running={isListening} />
              <button
                onClick={toggleMute}
                aria-label={isMuted ? 'Unmute alert sound' : 'Mute alert sound'}
                title="Toggle ding sound (M)"
                className="rounded-lg border border-white/10 px-3 py-1.5 text-sm hover:border-primary/60 transition-colors duration-300"
              >
                {isMuted ? '🔇' : '🔊'}
              </button>
              <button
                onClick={changeKey}
                title="Change AI provider or key"
                className="rounded-lg border border-white/10 px-3 py-1.5 text-sm hover:border-primary/60 transition-colors duration-300"
              >
                🔑
              </button>
              <button
                onClick={endSession}
                className="rounded-lg border border-false/50 px-3 py-1.5 text-sm font-medium text-false hover:bg-false/10 transition-colors duration-300"
              >
                End Session
              </button>
            </>
          )}
        </div>
      </header>

      {error && (
        <div className="shrink-0 border-b border-false/30 bg-false/10 px-5 py-2 text-sm text-false" role="alert">
          {error}
        </div>
      )}

      {phase === 'setup' ? (
        <ApiKeySetup onStart={beginSession} />
      ) : (
        <>
          {/* Main two-column layout */}
          <main className="flex min-h-0 flex-1 gap-5 p-5">
            <section className="min-h-0 basis-[60%] rounded-xl bg-surface/40 border border-white/5 p-5">
              <TranscriptFeed lines={lines} partial={partial} listening={isListening} />
            </section>
            <aside className="min-h-0 basis-[40%]" aria-live="polite" aria-label="Fact-check alerts">
              <AlertPanel currentAlert={currentAlert} alerts={alerts} taxonomy={taxonomy} />
            </aside>
          </main>

          {/* Bottom bar */}
          <footer className="shrink-0 border-t border-white/5 px-5 py-3">
            <AudioVisualizer levelRef={levelRef} active={isListening} />
          </footer>
        </>
      )}
    </div>
  );
}
