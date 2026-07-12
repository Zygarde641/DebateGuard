import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';

let deepgram;
function getDeepgram() {
  deepgram ??= createClient(process.env.DEEPGRAM_API_KEY);
  return deepgram;
}

export function createLiveTranscription({ onTranscript, onError, onClose }) {
  const connection = getDeepgram().listen.live({
    model: 'nova-3',
    language: 'en',
    encoding: 'linear16',
    sample_rate: 16000,
    channels: 1,
    interim_results: true,
    smart_format: true,
  });

  let open = false;
  const pending = []; // audio that arrives before the websocket opens
  const keepAlive = setInterval(() => {
    if (open) connection.keepAlive();
  }, 8000);

  connection.on(LiveTranscriptionEvents.Open, () => {
    open = true;
    for (const chunk of pending.splice(0)) connection.send(chunk);
  });

  connection.on(LiveTranscriptionEvents.Transcript, (data) => {
    const alt = data?.channel?.alternatives?.[0];
    if (!alt?.transcript) return;
    onTranscript({ text: alt.transcript, isFinal: Boolean(data.is_final) });
  });

  connection.on(LiveTranscriptionEvents.Error, (err) => onError?.(err));
  connection.on(LiveTranscriptionEvents.Close, () => {
    open = false;
    clearInterval(keepAlive);
    onClose?.();
  });

  return {
    send(chunk) {
      if (open) connection.send(chunk);
      else pending.push(chunk);
    },
    close() {
      clearInterval(keepAlive);
      try {
        connection.requestClose();
      } catch {
        /* already closed */
      }
    },
  };
}
