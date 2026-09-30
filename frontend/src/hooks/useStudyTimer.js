/**
 * Tracks real study time: while a logged-in student has the app open, visible,
 * and has interacted in the last 3 minutes, one minute is sent to the backend
 * every minute (saved to Supabase: study_sessions).
 */
import { useEffect, useRef } from 'react';
import { progressApi } from '../services/api';

const IDLE_LIMIT_MS = 3 * 60 * 1000;

export function useStudyTimer(enabled) {
  const lastActivity = useRef(Date.now());

  useEffect(() => {
    if (!enabled) return undefined;
    const mark = () => { lastActivity.current = Date.now(); };
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    events.forEach((e) => window.addEventListener(e, mark, { passive: true }));

    const interval = setInterval(() => {
      const visible = document.visibilityState === 'visible';
      const active = Date.now() - lastActivity.current < IDLE_LIMIT_MS;
      if (visible && active) progressApi.addStudyTime(1).catch(() => {});
    }, 60 * 1000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, mark));
      clearInterval(interval);
    };
  }, [enabled]);
}
