import { describe, expect, it } from 'vitest';
import { describePlates, loadPlates, PLATES, warmupRamp } from './plates';

describe('loadPlates', () => {
  it('loads 100 kg on a 20 kg bar as 25 + 15 per side', () => {
    const r = loadPlates(100, 20, PLATES.kg);
    expect(r.perSide).toEqual([25, 15]);
    expect(r.total).toBe(100);
    expect(r.remainder).toBe(0);
  });
  it('loads 225 lb as two 45s per side', () => {
    expect(loadPlates(225, 45, PLATES.lb).perSide).toEqual([45, 45]);
  });
  it('reports what cannot be made exactly', () => {
    const r = loadPlates(101, 20, PLATES.kg);
    expect(r.total).toBe(100);
    expect(r.remainder).toBe(1);
  });
  it('returns an empty bar at or below the bar weight', () => {
    expect(loadPlates(20, 20, PLATES.kg)).toEqual({ perSide: [], total: 20, remainder: 0 });
    expect(loadPlates(15, 20, PLATES.kg).perSide).toEqual([]);
  });
  it('describes repeated plates compactly', () => {
    expect(describePlates([25, 25, 10, 2.5])).toBe('2 × 25 · 10 · 2.5');
  });
});

describe('warmupRamp', () => {
  it('ramps a 100 kg barbell lift from the empty bar', () => {
    const r = warmupRamp(100, 'kg', { plateLoaded: true, bar: 20 });
    expect(r.map((s) => s.weight)).toEqual([20, 45, 65, 85]);
    expect(r.map((s) => s.reps)).toEqual([10, 5, 3, 2]);
  });
  it('keeps every step loadable and strictly increasing', () => {
    for (const w of [32.5, 47.5, 60, 140, 222.5]) {
      const r = warmupRamp(w, 'kg', { plateLoaded: true, bar: 20 });
      for (let i = 1; i < r.length; i++) expect(r[i].weight).toBeGreaterThan(r[i - 1].weight);
      for (const s of r) {
        expect(s.weight).toBeLessThan(w);
        expect(Math.round(s.weight / 2.5) * 2.5).toBeCloseTo(s.weight);
      }
    }
  });
  it('skips warm-ups when the working weight is the empty bar', () => {
    expect(warmupRamp(20, 'kg', { plateLoaded: true, bar: 20 })).toEqual([]);
  });
  it('uses two lighter sets for dumbbells', () => {
    const r = warmupRamp(30, 'kg', { plateLoaded: false });
    expect(r).toEqual([
      { weight: 15, reps: 8 },
      { weight: 22.5, reps: 4 },
    ]);
  });
  it('rounds lb ramps to 5 lb jumps and returns kg', () => {
    const r = warmupRamp(225 * 0.45359237, 'lb', { plateLoaded: true, bar: 45 });
    const lb = r.map((s) => Math.round(s.weight / 0.45359237));
    expect(lb[0]).toBe(45);
    for (const v of lb) expect(v % 5).toBe(0);
  });
});
