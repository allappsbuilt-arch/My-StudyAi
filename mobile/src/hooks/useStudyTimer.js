/**
 * Tracks real study time: while a logged-in student has the app open (foreground) and
 * touched the screen in the last 3 minutes, one minute is sent to the backend every minute.
 * Call markActivity() from the root touch handler.
 */
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { progressApi } from '../services/api';

const IDLE_LIMIT_MS = 3 * 60 * 1000;
let lastActivity = Date.now();

export const markActivity = () => { lastActivity = Date.now(); };

export function useStudyTimer(enabled) {
  useEffect(() => {
    if (!enabled) return undefined;
    markActivity();
    const interval = setInterval(() => {
      const visible = AppState.currentState === 'active';
      const active = Date.now() - lastActivity < IDLE_LIMIT_MS;
      if (visible && active) progressApi.addStudyTime(1).catch(() => {});
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [enabled]);
}
