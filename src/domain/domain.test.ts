import { describe, expect, it } from 'vitest';
import { computeRecords, estimate1RM, prKindsForSet, previousSets, workoutStats } from './calc';
import { exerciseSessions, muscleDistribution, volumeSeries, weekStreak } from './analytics';
import { generateInsights } from './insights';
import type { Workout, WorkoutSet } from './types';
import { LIBRARY_MAP } from '@/data/exercises';
import { generateSampleData } from '@/data/sample';
import { DAY, fmtWeight, fromDisplay, toDisplay } from '@/lib/util';
import { AppDataSchema } from './types';

const set = (weight: number, reps: number, extra: Partial<WorkoutSet> = {}): WorkoutSet => ({
  id: Math.random().toString(36),
  type: 'normal',
  weight,
  reps,
  completed: true,
  ...extra,
});
const workout = (startedAt: number, exerciseId: string, sets: WorkoutSet[]): Workout => ({
  id: Math.random().toString(36),
  name: 'W',
  startedAt,
  endedAt: startedAt + 3600_000,
  notes: '',
  exercises: [{ id: 'we', exerciseId, notes: '', sets }],
});
const lookup = (id: string) => LIBRARY_MAP.get(id);

describe('estimate1RM', () => {
  it('uses Epley and returns weight for single reps', () => {
    expect(estimate1RM(100, 1)).toBe(100);
    expect(estimate1RM(100, 10)).toBeCloseTo(133.33, 1);
    expect(estimate1RM(0, 5)).toBe(0);
  });
});

describe('workoutStats', () => {
  it('excludes warm-ups and incomplete sets from volume and set counts', () => {
    const w = workout(0, 'bench-press', [
      set(40, 10, { type: 'warmup' }),
      set(80, 8),
      set(80, 7),
      set(80, 6, { completed: false }),
    ]);
    const st = workoutStats(w);
    expect(st.volume).toBe(80 * 8 + 80 * 7);
    expect(st.sets).toBe(2);
    expect(st.reps).toBe(15);
    expect(st.exercises).toBe(1);
    expect(st.durationMs).toBe(3600_000);
  });
});

describe('previousSets', () => {
  it('returns completed sets from the most recent session for that exercise', () => {
    const a = workout(1000, 'bench-press', [set(70, 8)]);
    const b = workout(2000, 'bench-press', [set(75, 8), set(75, 7, { completed: false })]);
    const c = workout(3000, 'back-squat', [set(100, 5)]);
    const prev = previousSets([a, b, c], 'bench-press');
    expect(prev?.map((s) => s.weight)).toEqual([75]);
    expect(previousSets([a, b, c], 'bench-press', b.id)?.[0].weight).toBe(70);
    expect(previousSets([c], 'bench-press')).toBeNull();
  });
});

describe('records', () => {
  const ws = [
    workout(1000, 'bench-press', [set(80, 8), set(85, 3)]),
    workout(2000, 'bench-press', [set(82.5, 8), set(60, 15)]),
  ];
  it('tracks the best of each kind', () => {
    const { book, events } = computeRecords(ws);
    const r = book.get('bench-press')!;
    expect(r.weight!.value).toBe(85);
    expect(r.reps!.value).toBe(15);
    expect(r.volume!.value).toBe(60 * 15);
    expect(r.e1rm!.value).toBeCloseTo(estimate1RM(82.5, 8));
    // Baseline sets in the first workout aren't events; improvements are.
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((e) => e.date >= 1000)).toBe(true);
  });
  it('detects live PRs and ignores warm-ups / first-time exercises', () => {
    const { book } = computeRecords(ws);
    expect(prKindsForSet(book, 'bench-press', { weight: 90, reps: 2, type: 'normal', completed: true })).toContain('weight');
    expect(prKindsForSet(book, 'bench-press', { weight: 90, reps: 2, type: 'warmup', completed: true })).toEqual([]);
    expect(prKindsForSet(book, 'deadlift', { weight: 200, reps: 1, type: 'normal', completed: true })).toEqual([]);
  });
});

describe('analytics', () => {
  const now = new Date(2026, 10, 11, 12).getTime(); // Wed
  it('buckets weekly volume, including empty weeks', () => {
    const ws = [workout(now - DAY, 'bench-press', [set(100, 5)]), workout(now - 14 * DAY, 'bench-press', [set(100, 4)])];
    const series = volumeSeries(ws, 'week', 4, 1, now);
    expect(series).toHaveLength(4);
    expect(series[3].value).toBe(500);
    expect(series[2].value).toBe(0);
    expect(series[1].value).toBe(400);
  });
  it('weights secondary muscles at half a set', () => {
    const dist = muscleDistribution([workout(now, 'bench-press', [set(100, 5)])], lookup);
    const by = Object.fromEntries(dist.map((d) => [d.muscle, d.sets]));
    expect(by.chest).toBe(1);
    expect(by.triceps).toBe(0.5);
    expect(by.back).toBe(0);
  });
  it('computes exercise sessions and week streaks', () => {
    const ws = [0, 7, 14].map((d) => workout(now - d * DAY, 'bench-press', [set(100 - d, 5)]));
    const sess = exerciseSessions(ws, 'bench-press');
    expect(sess.map((s) => s.topWeight)).toEqual([86, 93, 100]);
    expect(weekStreak(ws, 1, now)).toBe(3);
  });
});

describe('insights', () => {
  it('reports a month-over-month increase in plain language', () => {
    const now = Date.now();
    const ws = [
      workout(now - 45 * DAY, 'bench-press', [set(80, 5)]),
      workout(now - 3 * DAY, 'bench-press', [set(85, 5)]),
    ];
    const ins = generateInsights(ws, lookup, 'kg', 1, now);
    expect(ins.some((i) => i.title === 'You increased Bench Press by 5 kg compared with last month.')).toBe(true);
  });
  it('produces no insights without data', () => {
    expect(generateInsights([], lookup, 'kg')).toEqual([]);
  });
});

describe('units', () => {
  it('round-trips kg/lb', () => {
    expect(toDisplay(fromDisplay(225, 'lb'), 'lb')).toBeCloseTo(225);
    expect(fmtWeight(100, 'lb')).toBe('220.5');
    expect(fmtWeight(82.5, 'kg')).toBe('82.5');
  });
});

describe('sample data', () => {
  it('is valid against the schema and has progression', () => {
    const data = generateSampleData(Date.now());
    expect(AppDataSchema.safeParse(data).success).toBe(true);
    expect(data.workouts.length).toBeGreaterThan(30);
    const bench = exerciseSessions(data.workouts, 'bench-press');
    expect(bench[bench.length - 1].topWeight).toBeGreaterThan(bench[0].topWeight);
  });
});
