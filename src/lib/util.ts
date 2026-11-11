import type { Unit } from '@/domain/types';

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const KG_PER_LB = 0.45359237;

/** Stored values are kg. Convert for display. */
export function toDisplay(kg: number, unit: Unit): number {
  return unit === 'kg' ? kg : kg / KG_PER_LB;
}
export function fromDisplay(value: number, unit: Unit): number {
  return unit === 'kg' ? value : value * KG_PER_LB;
}
export function roundTo(n: number, step: number): number {
  return Math.round(n / step) * step;
}
/** Format a stored weight (kg) in the user's unit, trimmed decimals. */
export function fmtWeight(kg: number | null | undefined, unit: Unit): string {
  if (kg == null) return '';
  const v = toDisplay(kg, unit);
  const r = Math.round(v * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}
export function weightStep(unit: Unit): number {
  return unit === 'kg' ? 2.5 : 5;
}

const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });
const whole = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
export function fmtVolume(kg: number, unit: Unit): string {
  const v = toDisplay(kg, unit);
  return v >= 100_000 ? compact.format(v) : whole.format(v);
}
/** Format an already-converted display number (no unit conversion). */
export function fmtNum(n: number): string {
  return Math.abs(n) >= 100_000 ? compact.format(n) : whole.format(n);
}
export function fmtInt(n: number): string {
  return whole.format(n);
}

export function fmtDuration(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h ? `${h}h ${m.toString().padStart(2, '0')}m` : `${m}m`;
}
export function fmtClock(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = (s % 60).toString().padStart(2, '0');
  return h ? `${h}:${m.toString().padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

export const DAY = 86_400_000;
export function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
export function startOfWeek(t: number, weekStartsOn: 0 | 1 = 1): number {
  const d = new Date(startOfDay(t));
  const diff = (d.getDay() - weekStartsOn + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d.getTime();
}
export function startOfMonth(t: number): number {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}
export function addDays(t: number, n: number): number {
  const d = new Date(t);
  d.setDate(d.getDate() + n);
  return d.getTime();
}
export function addMonths(t: number, n: number): number {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth() + n, 1).getTime();
}

const dateFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
const dateFmtYear = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const monthFmt = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const shortMonth = new Intl.DateTimeFormat(undefined, { month: 'short' });
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
export const fmtDate = (t: number) => dateFmt.format(t);
export const fmtDateYear = (t: number) => dateFmtYear.format(t);
export const fmtMonth = (t: number) => monthFmt.format(t);
export const fmtShortMonth = (t: number) => shortMonth.format(t);
export const fmtTime = (t: number) => timeFmt.format(t);

export function relativeDay(t: number, now = Date.now()): string {
  const days = Math.round((startOfDay(now) - startOfDay(t)) / DAY);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'Last week';
  return fmtDate(t);
}

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Seconds → "m:ss" (or plain seconds under a minute). */
export function fmtDurationInput(sec: number | null | undefined): string {
  if (sec == null) return '';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m ? `${m}:${String(s).padStart(2, '0')}` : String(s);
}
