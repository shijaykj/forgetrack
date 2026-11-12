/**
 * Platform bridge. ForgeTrack is one React app that runs in two places:
 *  - the browser (web / PWA), and
 *  - the iOS app (Capacitor shell, see capacitor.config.ts).
 * Everything platform-specific goes through this module so features never
 * branch on the platform themselves. Every call is best-effort: a missing
 * plugin or denied permission must never break logging a set.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import { StatusBar, Style } from '@capacitor/status-bar';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform() as 'ios' | 'android' | 'web';

const quiet = (p: Promise<unknown> | undefined) => void p?.catch(() => {});

/* ───────────────────────── Haptics ───────────────────────── */

/**
 * Maps the app's vibration-pattern vocabulary onto Taptic Engine feedback.
 * Small numbers are light ticks, bigger numbers firmer impacts, and patterns
 * (arrays) are "something happened" notifications such as rest end or a PR.
 */
export function nativeHaptic(pattern: number | number[]) {
  if (Array.isArray(pattern)) {
    quiet(Haptics.notification({ type: NotificationType.Success }));
    return;
  }
  if (pattern <= 6) quiet(Haptics.selectionChanged());
  else quiet(Haptics.impact({ style: pattern <= 10 ? ImpactStyle.Light : ImpactStyle.Medium }));
}

/* ─────────────────── Rest-timer notifications ─────────────────── */

const REST_ID = 4201;
let notifPermission: 'granted' | 'denied' | 'prompt' | 'unknown' = 'unknown';

export async function restAlertPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  if (!isNative) return 'denied';
  try {
    const { display } = await LocalNotifications.checkPermissions();
    notifPermission = display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'prompt';
  } catch {
    notifPermission = 'denied';
  }
  return notifPermission as 'granted' | 'denied' | 'prompt';
}

export async function requestRestAlerts(): Promise<boolean> {
  if (!isNative) return false;
  try {
    const { display } = await LocalNotifications.requestPermissions();
    notifPermission = display === 'granted' ? 'granted' : 'denied';
  } catch {
    notifPermission = 'denied';
  }
  return notifPermission === 'granted';
}

/**
 * Schedule (or clear, with `endsAt = null`) the system notification that fires
 * when rest ends. Scheduled by iOS itself, so it is delivered even when the
 * phone is locked or ForgeTrack is suspended in the background.
 */
export async function syncRestNotification(endsAt: number | null, label = '') {
  if (!isNative) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: REST_ID }] });
    if (!endsAt || endsAt - Date.now() < 1500) return;
    if (notifPermission === 'unknown') await restAlertPermission();
    if (notifPermission !== 'granted') return;
    await LocalNotifications.schedule({
      notifications: [
        {
          id: REST_ID,
          title: 'Rest complete',
          body: label ? `${label} — time for your next set.` : 'Time for your next set.',
          schedule: { at: new Date(endsAt), allowWhileIdle: true },
          sound: undefined,
        },
      ],
    });
  } catch {
    /* notifications are a nicety */
  }
}

/* ───────────────────────── Status bar ───────────────────────── */

export function syncStatusBar(theme: 'dark' | 'light') {
  if (!isNative) return;
  // Style.Dark = light text, for dark backgrounds.
  quiet(StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light }));
}

/* ─────────────────── Keep the screen on mid-workout ─────────────────── */

let wakeSentinel: { release(): Promise<void> } | null = null;
let wantAwake = false;

async function acquireWebWakeLock() {
  const wl = (navigator as Navigator & { wakeLock?: { request(t: 'screen'): Promise<{ release(): Promise<void> }> } }).wakeLock;
  if (!wl || wakeSentinel || document.visibilityState !== 'visible') return;
  try {
    wakeSentinel = await wl.request('screen');
    (wakeSentinel as unknown as EventTarget).addEventListener?.('release', () => (wakeSentinel = null));
  } catch {
    /* denied or unsupported */
  }
}

if (typeof document !== 'undefined' && !isNative) {
  // Browsers drop wake locks when the page is hidden; re-acquire on return.
  document.addEventListener('visibilitychange', () => wantAwake && void acquireWebWakeLock());
}

export async function setKeepAwake(on: boolean) {
  if (on === wantAwake) return;
  wantAwake = on;
  if (isNative) {
    quiet(on ? KeepAwake.keepAwake() : KeepAwake.allowSleep());
    return;
  }
  if (on) await acquireWebWakeLock();
  else {
    const s = wakeSentinel;
    wakeSentinel = null;
    quiet(s?.release());
  }
}

/* ─────────────────── Files: export + durable mirror ─────────────────── */

/**
 * Export a file. In the browser this is a download; on iPhone it writes the
 * file to the app cache and opens the share sheet (Save to Files, AirDrop …).
 */
export async function saveFile(name: string, data: string, type: string): Promise<'downloaded' | 'shared' | 'cancelled'> {
  if (isNative) {
    try {
      const { uri } = await Filesystem.writeFile({ path: name, data, directory: Directory.Cache, encoding: Encoding.UTF8 });
      await Share.share({ title: name, files: [uri] });
      return 'shared';
    } catch {
      return 'cancelled';
    }
  }
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}

/**
 * On iOS the WebView's IndexedDB can, in rare low-storage situations, be
 * purged by the OS. We mirror the data document to the app's Documents
 * folder (also visible in the Files app under "ForgeTrack") so the log is
 * never lost, and restore from it if IndexedDB comes back empty.
 */
const MIRROR = 'forgetrack-data.json';

export async function writeMirror(json: string) {
  if (!isNative) return;
  try {
    await Filesystem.writeFile({ path: MIRROR, data: json, directory: Directory.Documents, encoding: Encoding.UTF8 });
  } catch {
    /* best-effort */
  }
}

export async function readMirror(): Promise<string | null> {
  if (!isNative) return null;
  try {
    const { data } = await Filesystem.readFile({ path: MIRROR, directory: Directory.Documents, encoding: Encoding.UTF8 });
    return typeof data === 'string' && data.length > 0 ? data : null;
  } catch {
    return null;
  }
}

/* ─────────────────── Live Activity (lock screen + Dynamic Island) ─────────────────── */

export interface WorkoutActivityState {
  workoutName: string;
  startedAt: number;
  restEndsAt: number | null;
  restTotalSec: number;
  pausedRemainingSec: number | null;
  setsDone: number;
  setsTotal: number;
  currentExercise: string;
}

/** Implemented in ios/App/App/WorkoutActivityPlugin.swift (iOS 16.2+). */
const WorkoutActivity = registerPlugin<{
  sync(state: WorkoutActivityState): Promise<{ active: boolean }>;
  end(): Promise<void>;
}>('WorkoutActivity');

let lastActivity = '';

/** Start/update the live-workout Live Activity, or end it with `null`. Deduplicates identical updates. */
export function syncWorkoutActivity(state: WorkoutActivityState | null) {
  if (platform !== 'ios') return;
  const key = state ? JSON.stringify(state) : '';
  if (key === lastActivity) return;
  lastActivity = key;
  quiet(state ? WorkoutActivity.sync(state) : WorkoutActivity.end());
}

/* ─────────────────── Apple Health (write-only) ─────────────────── */

export type HealthStatus = 'authorized' | 'denied' | 'notDetermined' | 'unavailable';

/** Implemented in ios/App/App/HealthPlugin.swift. */
const Health = registerPlugin<{
  status(): Promise<{ status: HealthStatus }>;
  requestAuthorization(): Promise<{ status: HealthStatus }>;
  saveWorkout(w: { id: string; name: string; start: number; end: number; volumeKg: number; sets: number }): Promise<{ saved: boolean }>;
}>('Health');

export async function healthStatus(): Promise<HealthStatus> {
  if (platform !== 'ios') return 'unavailable';
  try {
    return (await Health.status()).status;
  } catch {
    return 'unavailable';
  }
}

export async function requestHealth(): Promise<HealthStatus> {
  if (platform !== 'ios') return 'unavailable';
  try {
    return (await Health.requestAuthorization()).status;
  } catch {
    return 'unavailable';
  }
}

/** Save a finished workout as a strength-training session. Resolves false on any failure. */
export async function saveWorkoutToHealth(w: { id: string; name: string; start: number; end: number; volumeKg: number; sets: number }): Promise<boolean> {
  if (platform !== 'ios') return false;
  try {
    return (await Health.saveWorkout(w)).saved;
  } catch {
    return false;
  }
}
