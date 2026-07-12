// ponytail: naive decimation resampler — fine for speech; swap for linear interpolation if STT quality suffers
export function downsampleTo16k(input, inputRate) {
  if (inputRate === 16000) return input;
  const ratio = inputRate / 16000;
  const length = Math.floor(input.length / ratio);
  const result = new Float32Array(length);
  for (let i = 0; i < length; i++) result[i] = input[Math.floor(i * ratio)];
  return result;
}

export function floatTo16BitPCM(float32) {
  const out = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}
