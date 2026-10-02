/**
 * Speech helpers.
 *
 *  useSpeechRecognition({ lang, continuous }) -> { supported, listening, transcript, interim, start, stop, reset, setTranscript, error }
 *    Native: expo-speech-recognition (needs a development / production build, not Expo Go).
 *    Web preview: the browser's Web Speech API (Chrome / Edge / Safari).
 *
 *  speak(text, { lang, rate, gender, onEnd }) -> reads text aloud (expo-speech).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Speech from 'expo-speech';

let Native = null;
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line global-require
    Native = require('expo-speech-recognition');
    if (!Native?.ExpoSpeechRecognitionModule?.isRecognitionAvailable?.()) Native = Native?.ExpoSpeechRecognitionModule ? Native : null;
  } catch {
    Native = null; // Expo Go: the native module is not bundled
  }
}
const WebRecognition = Platform.OS === 'web' && typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

function useNativeEvents(name, handler) {
  // expo-speech-recognition exposes a hook for events
  const useEvent = Native?.useSpeechRecognitionEvent;
  if (useEvent) useEvent(name, handler); // eslint-disable-line react-hooks/rules-of-hooks
}

export function useSpeechRecognition({ lang = 'en-US', continuous = true } = {}) {
  const recRef = useRef(null);
  const wantRef = useRef(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');

  const append = useCallback((text) => setTranscript((t) => `${t}${t && !t.endsWith(' ') ? ' ' : ''}${text.trim()}`), []);

  // ----- native events (no-ops when the module is missing)
  useNativeEvents('result', (e) => {
    const text = e.results?.[0]?.transcript || '';
    if (e.isFinal) { if (text) append(text); setInterim(''); } else setInterim(text);
  });
  useNativeEvents('end', () => { setListening(false); setInterim(''); });
  useNativeEvents('error', (e) => {
    if (e.error === 'not-allowed') setError('Microphone permission was denied. Allow microphone access in your phone settings to use voice input.');
    else if (e.error !== 'no-speech' && e.error !== 'aborted') setError(`Voice input error: ${e.error}`);
    setListening(false);
  });

  const stop = useCallback(() => {
    wantRef.current = false;
    if (Native) Native.ExpoSpeechRecognitionModule.stop();
    else recRef.current?.stop();
    setListening(false);
    setInterim('');
  }, []);

  const start = useCallback(async () => {
    setError('');
    if (Native) {
      const perm = await Native.ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) return setError('Microphone permission was denied. Allow microphone access in your phone settings to use voice input.');
      Native.ExpoSpeechRecognitionModule.start({ lang, interimResults: true, continuous });
      setListening(true);
      return undefined;
    }
    if (!WebRecognition) return undefined;
    const rec = new WebRecognition();
    rec.lang = lang;
    rec.continuous = continuous;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let finalText = '';
      let temp = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
        else temp += e.results[i][0].transcript;
      }
      if (finalText) append(finalText);
      setInterim(temp);
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed') {
        setError('Microphone permission was denied. Allow microphone access in your browser to use voice input.');
        wantRef.current = false;
      } else if (e.error !== 'no-speech' && e.error !== 'aborted') setError(`Voice input error: ${e.error}`);
    };
    rec.onend = () => {
      if (wantRef.current && continuous) {
        try { rec.start(); } catch { /* already started */ }
      } else setListening(false);
    };
    recRef.current = rec;
    wantRef.current = true;
    try { rec.start(); setListening(true); } catch { setListening(false); }
    return undefined;
  }, [lang, continuous, append]);

  const reset = useCallback(() => { setTranscript(''); setInterim(''); }, []);

  useEffect(() => () => {
    wantRef.current = false;
    recRef.current?.abort?.();
    try { Native?.ExpoSpeechRecognitionModule.abort(); } catch { /* ignore */ }
  }, []);

  return { supported: Boolean(Native || WebRecognition), listening, transcript, interim, start, stop, reset, setTranscript, error };
}

export const canSpeak = true;

export function speak(text, { lang = 'en-US', rate = 1, gender = 'female', onEnd } = {}) {
  if (!text) return;
  Speech.stop();
  Speech.speak(text, { language: lang, rate, pitch: gender === 'male' ? 0.8 : 1, onDone: () => onEnd?.(), onStopped: () => onEnd?.(), onError: () => onEnd?.() });
}

export function stopSpeaking() {
  Speech.stop();
}
