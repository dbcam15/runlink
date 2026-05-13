import { useEffect, useRef } from 'react';

export function useTranscription(
  active: boolean,
  onResult: (text: string) => void,
) {
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    if (!active) return;

    let Voice: any;
    try {
      Voice = require('@react-native-voice/voice').default;
      if (!Voice) return;
    } catch {
      // native module not available in Expo Go — transcription disabled
      return;
    }

    Voice.onSpeechResults = (e: any) => {
      const text = e.value?.[0];
      if (text) onResultRef.current(text);
    };

    Voice.onSpeechEnd = () => {
      Voice.start('en-US').catch(() => {});
    };

    Voice.start('en-US').catch(() => {});

    return () => {
      Voice.stop();
      Voice.destroy().catch(() => {});
      Voice.onSpeechResults = undefined;
      Voice.onSpeechEnd = undefined;
    };
  }, [active]);
}
