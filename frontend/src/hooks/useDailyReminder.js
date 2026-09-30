/**
 * Browser reminder: once a day after 6 pm, if the student enabled Study Reminders
 * and Push Notifications (and allowed browser notifications) but hasn't studied yet today.
 */
import { useEffect } from 'react';
import { progressApi } from '../services/api';

const KEY = 'mystudyai_last_reminder';

export function useDailyReminder(user) {
  const prefs = user?.preferences || {};
  const enabled = Boolean(prefs.studyReminders && prefs.pushNotifications);
  const [hh, mm] = String(prefs.reminderTime || '18:00').split(':').map(Number);
  const streakAlerts = prefs.streakAlerts !== false;

  useEffect(() => {
    if (!enabled || !('Notification' in window) || Notification.permission !== 'granted') return;
    const now = new Date();
    if (now.getHours() * 60 + now.getMinutes() < hh * 60 + (mm || 0)) return;
    const today = new Date().toDateString();
    try {
      if (localStorage.getItem(KEY) === today) return;
    } catch {
      return;
    }
    progressApi
      .overview({ activityLimit: 1 })
      .then((res) => {
        try { localStorage.setItem(KEY, today); } catch { /* ignore */ }
        if (!res.streak.studiedToday) {
          new Notification('MyStudyAI', {
            body: res.streak.current && streakAlerts ? `Keep your ${res.streak.current}-day streak going - a quick quiz counts!` : 'A few minutes of study today keeps you on track.',
            icon: '/favicon.svg',
          });
        }
      })
      .catch(() => {});
  }, [enabled, hh, mm, streakAlerts]);
}
