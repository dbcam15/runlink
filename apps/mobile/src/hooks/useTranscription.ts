import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

export function useTranscription(active: boolean, onResult: (text: string) => void) {
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    if (!active) return;

    if (Platform.OS === 'web') {
      // Browser Web Speech API
      const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
      if (!SR) return;

      const recognition = new SR();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (e: any) => {
        const text = e.results[e.results.length - 1]?.[0]?.transcript?.trim();
        if (text) onResultRef.current(text);
      };

      recognition.onend = () => {
        try { recognition.start(); } catch {}
      };

      try { recognition.start(); } catch {}

      return () => {
        recognition.onend = null;
        try { recognition.stop(); } catch {}
      };
    }

    // Native: @react-native-voice/voice
    let Voice: any;
    try {
      Voice = require('@react-native-voice/voice').default;
      if (!Voice) return;
    } catch { return; }

    try {
      Voice.onSpeechResults = (e: any) => {
        const text = e.value?.[0];
        if (text) onResultRef.current(text);
      };
      Voice.onSpeechEnd = () => { try { Voice.start('en-US'); } catch {} };
      Voice.start('en-US');
    } catch { return; }

    return () => {
      try {
        Voice.stop(); Voice.destroy();
        Voice.onSpeechResults = undefined;
        Voice.onSpeechEnd = undefined;
      } catch {}
    };
  }, [active]);
}
