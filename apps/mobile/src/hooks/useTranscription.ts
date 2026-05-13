import { useEffect, useRef } from 'react';

export function useTranscription(active: boolean, onResult: (text: string) => void) {
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    if (!active) return;

    let Voice: any;
    try {
      Voice = require('@react-native-voice/voice').default;
    } catch {
      return;
    }

    // native module may exist as a JS stub but not be linked — guard every call
    try {
      Voice.onSpeechResults = (e: any) => {
        const text = e.value?.[0];
        if (text) onResultRef.current(text);
      };
      Voice.onSpeechEnd = () => {
        try { Voice.start('en-US'); } catch {}
      };
      Voice.start('en-US');
    } catch {
      return;
    }

    return () => {
      try {
        Voice.stop();
        Voice.destroy();
        Voice.onSpeechResults = undefined;
        Voice.onSpeechEnd = undefined;
      } catch {}
    };
  }, [active]);
}
