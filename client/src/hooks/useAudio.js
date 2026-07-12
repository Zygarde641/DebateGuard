import { useRef, useCallback } from 'react';
import { downsampleTo16k, floatTo16BitPCM } from '../utils/audioUtils';

// Mic capture (PCM16 @ 16kHz chunks) + mic level + the Web Audio ding.
export function useAudio() {
  const ctxRef = useRef(null);
  const streamRef = useRef(null);
  const processorRef = useRef(null);
  const levelRef = useRef(0); // 0..1, read by AudioVisualizer via rAF

  const start = useCallback(async (onChunk) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
    });
    streamRef.current = stream;

    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    ctxRef.current = ctx;

    const source = ctx.createMediaStreamSource(stream);
    // ponytail: ScriptProcessor is deprecated but universal; move to AudioWorklet if it ever breaks
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      let sum = 0;
      for (let i = 0; i < input.length; i += 32) sum += input[i] * input[i];
      levelRef.current = Math.min(1, Math.sqrt(sum / (input.length / 32)) * 4);

      const down = downsampleTo16k(input, ctx.sampleRate);
      onChunk(floatTo16BitPCM(down).buffer);
    };

    source.connect(processor);
    processor.connect(ctx.destination); // required for onaudioprocess to fire; output stays silent
  }, []);

  const stop = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    ctxRef.current?.close();
    ctxRef.current = null;
    levelRef.current = 0;
  }, []);

  // Calm, authoritative bell — synthesized, no audio file.
  const playDing = useCallback(() => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.7, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.8);
    setTimeout(() => ctx.close(), 1000);
  }, []);

  return { start, stop, playDing, levelRef };
}
