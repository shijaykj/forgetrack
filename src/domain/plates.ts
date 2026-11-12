import type { Equipment, Unit } from './types';

/**
 * Plate math and warm-up ramps. Pure functions: plate maths works in the
 * user's display unit (plates are physical kg or lb objects), warm-ups take and
 * return stored kilograms like the rest of the domain.
 */

/** Standard plates available in most gyms, heaviest first. */
export const PLATES: Record<Unit, number[]> = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
  lb: [45, 35, 25, 10, 5, 2.5],
};
export const DEFAULT_BAR: Record<Unit, number> = { kg: 20, lb: 45 };
export const BAR_OPTIONS: Record<Unit, number[]> = { kg: [20, 15, 10], lb: [45, 35, 25] };

/** Equipment loaded with plates on a bar. */
export const PLATE_LOADED: Equipment[] = ['barbell', 'ez-bar', 'smith'];

export interface PlateLoad {
  /** Plates for ONE side, heaviest first. */
  perSide: number[];
  /** Weight actually on the bar with these plates. */
  total: number;
  /** target − total (> 0 when the target can't be made exactly). */
  remainder: number;
}

const EPS = 1e-6;
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Greedy plate loading — optimal for standard plate denominations. */
export function loadPlates(target: number, bar: number, plates: number[]): PlateLoad {
  if (!(target > bar)) return { perSide: [], total: bar, remainder: r2(Math.max(0, target - bar)) };
  let side = (target - bar) / 2;
  const perSide: number[] = [];
  for (const p of [...plates].sort((a, b) => b - a)) {
    while (side + EPS >= p) {
      perSide.push(p);
      side -= p;
    }
  }
  const total = r2(bar + 2 * perSide.reduce((a, b) => a + b, 0));
  return { perSide, total, remainder: r2(target - total) };
}

/** "20 · 10 · 2.5" or "2 × 20 · 5" (groups repeated plates). */
export function describePlates(perSide: number[]): string {
  const groups: [number, number][] = [];
  for (const p of perSide) {
    const last = groups[groups.length - 1];
    if (last && last[0] === p) last[1]++;
    else groups.push([p, 1]);
  }
  return groups.map(([p, n]) => (n > 1 ? `${n} × ${p}` : String(p))).join(' · ');
}

export interface WarmupSet {
  weight: number; // kg
  reps: number;
}

const KG_PER_LB = 0.45359237;
const toUnit = (kg: number, u: Unit) => (u === 'kg' ? kg : kg / KG_PER_LB);
const fromUnit = (v: number, u: Unit) => (u === 'kg' ? v : v * KG_PER_LB);

/**
 * Warm-up ramp toward a working weight.
 *  - Plate-loaded: empty bar × 10, then ~45 % × 5, 65 % × 3, 85 % × 2, rounded
 *    to the smallest loadable jump (a pair of the smallest plates).
 *  - Everything else (dumbbells, machines, cables): 50 % × 8, 75 % × 4.
 * Steps that would be at or above ~92 % of the working weight, at or below the
 * previous step, or lighter than the empty bar are dropped.
 */
export function warmupRamp(workKg: number, unit: Unit, opts: { plateLoaded: boolean; bar?: number }): WarmupSet[] {
  if (!(workKg > 0)) return [];
  const work = toUnit(workKg, unit);
  const out: { w: number; reps: number }[] = [];
  if (opts.plateLoaded) {
    const bar = opts.bar ?? DEFAULT_BAR[unit];
    const jump = Math.min(...PLATES[unit]) * 2;
    if (work <= bar + EPS) return [];
    out.push({ w: bar, reps: 10 });
    for (const [pct, reps] of [
      [0.45, 5],
      [0.65, 3],
      [0.85, 2],
    ] as const) {
      const w = Math.round((work * pct) / jump) * jump;
      if (w <= bar + EPS || w >= work * 0.92 || w <= out[out.length - 1].w + EPS) continue;
      out.push({ w, reps });
    }
  } else {
    const step = unit === 'kg' ? 2.5 : 5;
    for (const [pct, reps] of [
      [0.5, 8],
      [0.75, 4],
    ] as const) {
      const w = Math.round((work * pct) / step) * step;
      if (w <= 0 || w >= work * 0.92 || (out.length && w <= out[out.length - 1].w + EPS)) continue;
      out.push({ w, reps });
    }
  }
  return out.map(({ w, reps }) => ({ weight: fromUnit(w, unit), reps }));
}
