/**
 * Daily study reminder as a local notification at the student's reminder time
 * (needs Study Reminders + Push Notifications enabled in Settings). Scheduling is done on the
 * device, so it works without a server. Does nothing on web or in Expo Go.
 */
import { useEffect } from 'react';
import { Platform } from 'react-native';

export function useDailyReminder(user) {
  const prefs = user?.preferences || {};
  const enabled = Boolean(prefs.studyReminders && prefs.pushNotifications);
  const [hh, mm] = String(prefs.reminderTime || '18:00').split(':').map(Number);

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    let cancelled = false;
    (async () => {
      try {
        const Notifications = await import('expo-notifications');
        await Notifications.cancelAllScheduledNotificationsAsync();
        if (!enabled || cancelled) return;
        const perm = await Notifications.requestPermissionsAsync();
        if (!perm.granted || cancelled) return;
        await Notifications.scheduleNotificationAsync({
          content: { title: 'MyStudyAI', body: 'A few minutes of study today keeps your streak going.' },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: hh || 0, minute: mm || 0 },
        });
      } catch { /* notifications unavailable */ }
    })();
    return () => { cancelled = true; };
  }, [enabled, hh, mm]);
}
