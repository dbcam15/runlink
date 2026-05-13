import { useEffect, useRef, useCallback } from 'react';
import Voice, { SpeechResultsEvent } from '@react-native-voice/voice';

export function useTranscription(
  active: boolean,
  onResult: (text: string) => void,
) {
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    if (!active) return;

    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      const text = e.value?.[0];
      if (text) onResultRef.current(text);
    };

    Voice.onSpeechEnd = () => {
      // restart continuous recognition
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
