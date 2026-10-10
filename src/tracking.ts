import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

export const LOCATION_TASK = 'pacer-location-updates';
type Handler = (locs: Location.LocationObject[]) => void;

let handler: Handler | null = null;
let watchSub: Location.LocationSubscription | null = null;
let usingBackground = false;

// Must be defined when the app loads (this file is imported by app/_layout.tsx).
TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error || !data || !handler) return;
  const { locations } = data as { locations: Location.LocationObject[] };
  handler(locations);
});

export async function startTracking(onLocations: Handler): Promise<{ ok: boolean; message: string | null }> {
  handler = onLocations;
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') {
    return { ok: false, message: 'Pacer needs location access to measure your run. Turn it on in your phone settings.' };
  }

  let bg = false;
  try { bg = (await Location.requestBackgroundPermissionsAsync()).status === 'granted'; } catch { bg = false; }

  if (bg) {
    try {
      await Location.startLocationUpdatesAsync(LOCATION_TASK, {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 0,
        activityType: Location.ActivityType.Fitness,
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'Pacer is tracking your run',
          notificationBody: 'Tap to go back to your run.',
          notificationColor: '#1B3BCF',
        },
      });
      usingBackground = true;
      return { ok: true, message: null };
    } catch {
      // falls through to foreground tracking (e.g. inside Expo Go)
    }
  }

  watchSub = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
    (loc) => handler?.([loc]),
  );
  return { ok: true, message: 'Background tracking is off, so keep Pacer open during your run.' };
}

export async function stopTracking() {
  handler = null;
  watchSub?.remove();
  watchSub = null;
  if (usingBackground) {
    try {
      if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    } catch { /* already stopped */ }
    usingBackground = false;
  }
}
