import { useApp } from '@/store/app';
import { isNative, nativeHaptic } from '@/lib/native';

/** Haptic feedback: Taptic Engine on iPhone, vibration on Android browsers; silently no-ops elsewhere. */
export function haptic(pattern: number | number[] = 12) {
  if (!useApp.getState().profile.haptics) return;
  if (isNative) return nativeHaptic(pattern);
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
}

let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx ??= new AC();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Unlock audio on the first user gesture so the rest-timer chime can play later. */
export function primeAudio() {
  audio();
}

function tone(freq: number, at: number, dur: number, gain = 0.14) {
  const a = audio();
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = 'sine';
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, a.currentTime + at);
  g.gain.linearRampToValueAtTime(gain, a.currentTime + at + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + at + dur);
  o.connect(g).connect(a.destination);
  o.start(a.currentTime + at);
  o.stop(a.currentTime + at + dur + 0.05);
}

export function chime() {
  if (!useApp.getState().profile.sound) return;
  tone(880, 0, 0.18);
  tone(1320, 0.16, 0.32);
}
export function tick() {
  if (!useApp.getState().profile.sound) return;
  tone(660, 0, 0.06, 0.06);
}
