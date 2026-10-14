import { Platform } from 'react-native';
import { loadPlan, loadRuns, loadSettings } from './storage';
import { planFor } from './plans';
import { planDays, scheduleSessions } from './schedule';

/**
 * Run reminders: a weekly notification at the chosen time on each planned day (the training
 * plan's days, or every day you can run). expo-notifications is a native module, so it's loaded
 * lazily: builds made before it was added simply have no reminders instead of crashing.
 */
type NotificationsModule = typeof import('expo-notifications');
let N: NotificationsModule | null | undefined;
function notifications(): NotificationsModule | null {
  if (N === undefined) {
    try { N = require('expo-notifications') as NotificationsModule; } catch { N = null; }
  }
  return N;
}

export const remindersAvailable = () => !!notifications();

let handlerSet = false;
async function prepare(n: NotificationsModule) {
  if (!handlerSet) {
    handlerSet = true;
    n.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
    });
  }
  if (Platform.OS === 'android') {
    await n.setNotificationChannelAsync('reminders', { name: 'Run reminders', importance: n.AndroidImportance.DEFAULT });
  }
}

/** Asks for permission to send notifications. False if refused or not available in this build. */
export async function allowReminders(): Promise<boolean> {
  const n = notifications();
  if (!n) return false;
  try {
    await prepare(n);
    const current = await n.getPermissionsAsync();
    if (current.granted) return true;
    return (await n.requestPermissionsAsync()).granted;
  } catch { return false; }
}

let lastSig = '';

/** Replaces all scheduled reminders to match the current settings, schedule and plan. */
export async function syncReminders() {
  const n = notifications();
  if (!n) return;
  try {
    const s = await loadSettings();
    const allowed = s.reminders && (await n.getPermissionsAsync()).granted;
    const [progress, runs] = await Promise.all([loadPlan(), loadRuns()]);
    const plan = planFor(progress);
    const days = plan ? planDays(s.runDays, plan.perWeek) : s.runDays;
    const upcoming = plan && progress ? scheduleSessions(plan, progress, s.runDays, runs).slice(0, 7) : [];
    const [hour, minute] = s.reminderTime.split(':').map(Number);
    const wanted = allowed ? days.map((day) => {
      const session = upcoming.find((u) => u.date.getDay() === day)?.session;
      return {
        day,
        title: plan ? `${plan.name}: run day 🏃` : 'Time for a run? 🏃',
        body: session ? `${session.title}: ${session.summary}` : plan ? 'Your next session is ready when you are.' : "It's one of your running days. Even a short one counts!",
      };
    }) : [];
    // Only reschedule when something changed (this runs every time the Run tab opens).
    const sig = JSON.stringify({ wanted, hour, minute });
    if (sig === lastSig) return;
    lastSig = sig;
    await n.cancelAllScheduledNotificationsAsync();
    if (!wanted.length) return;
    await prepare(n);
    for (const w of wanted) {
      await n.scheduleNotificationAsync({
        content: { title: w.title, body: w.body },
        trigger: { type: n.SchedulableTriggerInputTypes.WEEKLY, weekday: w.day + 1, hour, minute, channelId: 'reminders' },
      });
    }
  } catch {
    // Reminders are a nice-to-have; never let them break the app.
  }
}
