import { useState, useEffect } from 'react';

export function useMicrophone(active: boolean) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active || typeof navigator === 'undefined') return;
    let s: MediaStream | null = null;

    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(ms => { s = ms; setStream(ms); })
      .catch(e => setError(e.message));

    return () => {
      s?.getTracks().forEach(t => t.stop());
      setStream(null);
    };
  }, [active]);

  return { stream, error };
}
