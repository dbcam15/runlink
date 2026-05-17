import { useEffect, useRef } from 'react';

const THRESHOLD = 0.012;
const SILENCE_DEBOUNCE_MS = 600;

export function useVAD(
  stream: MediaStream | null,
  onSpeaking: (speaking: boolean) => void,
) {
  const onSpeakingRef = useRef(onSpeaking);
  onSpeakingRef.current = onSpeaking;

  useEffect(() => {
    if (!stream || typeof AudioContext === 'undefined') return;

    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);

    const buf = new Float32Array(analyser.fftSize);
    let speaking = false;
    let silenceTimer: ReturnType<typeof setTimeout> | null = null;

    const tick = () => {
      analyser.getFloatTimeDomainData(buf);
      const rms = Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / buf.length);

      if (rms > THRESHOLD) {
        if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
        if (!speaking) { speaking = true; onSpeakingRef.current(true); }
      } else if (speaking && !silenceTimer) {
        silenceTimer = setTimeout(() => {
          speaking = false;
          silenceTimer = null;
          onSpeakingRef.current(false);
        }, SILENCE_DEBOUNCE_MS);
      }
    };

    const interval = setInterval(tick, 80);

    return () => {
      clearInterval(interval);
      if (silenceTimer) clearTimeout(silenceTimer);
      ctx.close();
    };
  }, [stream]);
}
