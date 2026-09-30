/**
 * Browser speech helpers (no server needed).
 *
 *  useSpeechRecognition({ lang, continuous }) -> { supported, listening, transcript, interim, start, stop, reset, error }
 *    Uses the Web Speech API (Chrome / Edge / Safari). Firefox has no support: `supported` is false.
 *
 *  speak(text, { lang, rate, gender }) -> reads text aloud with speechSynthesis.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const Recognition = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export function useSpeechRecognition({ lang = 'en-US', continuous = true } = {}) {
  const recRef = useRef(null);
  const wantRef = useRef(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');

  const stop = useCallback(() => {
    wantRef.current = false;
    recRef.current?.stop();
    setListening(false);
    setInterim('');
  }, []);

  const start = useCallback(() => {
    if (!Recognition) return;
    setError('');
    const rec = new Recognition();
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
      if (finalText) setTranscript((t) => `${t}${t && !t.endsWith(' ') ? ' ' : ''}${finalText.trim()}`);
      setInterim(temp);
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed') {
        setError('Microphone permission was denied. Allow microphone access in your browser to use voice input.');
        wantRef.current = false;
      } else if (e.error !== 'no-speech' && e.error !== 'aborted') setError(`Voice input error: ${e.error}`);
    };
    // Chrome stops after a pause; restart while the user still wants to listen
    rec.onend = () => {
      if (wantRef.current && continuous) {
        try { rec.start(); } catch { /* already started */ }
      } else setListening(false);
    };
    recRef.current = rec;
    wantRef.current = true;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [lang, continuous]);

  const reset = useCallback(() => {
    setTranscript('');
    setInterim('');
  }, []);

  useEffect(() => () => {
    wantRef.current = false;
    recRef.current?.abort?.();
  }, []);

  return { supported: Boolean(Recognition), listening, transcript, interim, start, stop, reset, setTranscript, error };
}

export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

/** Pick a voice for a language, preferring the requested gender when the name hints at it. */
function pickVoice(lang, gender) {
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith(lang.toLowerCase().slice(0, 2)));
  const exact = voices.filter((v) => v.lang.toLowerCase() === lang.toLowerCase());
  const pool = exact.length ? exact : voices;
  const female = /female|woman|zira|samantha|victoria|karen|susan|hazel|heera|kalpana|sabina|helena|monica|google uk english female/i;
  const male = /male|man|david|mark|daniel|george|alex|fred|ravi|hemant|pablo|jorge|google uk english male/i;
  const re = gender === 'male' ? male : female;
  return pool.find((v) => re.test(v.name) && !(gender === 'male' && /female/i.test(v.name))) || pool[0] || null;
}

export function speak(text, { lang = 'en-US', rate = 1, gender = 'female', onEnd } = {}) {
  if (!canSpeak || !text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = rate;
  const voice = pickVoice(lang, gender);
  if (voice) u.voice = voice;
  if (gender === 'male' && !voice) u.pitch = 0.8;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (canSpeak) window.speechSynthesis.cancel();
}
