import { addDays, addMonths, DAY, startOfDay, startOfMonth, startOfWeek } from '@/lib/util';
import { E1RM_MAX_REPS, estimate1RM, isWorkingSet, setVolume, workoutStats } from './calc';
import type { Exercise, MuscleGroup, Workout } from './types';
import { MUSCLE_GROUPS } from './types';

export type ExerciseLookup = (id: string) => Exercise | undefined;

export interface SeriesPoint {
  t: number; // bucket start
  value: number;
  count: number;
}

/** Volume per bucket (week or month), oldest → newest, including empty buckets. */
export function volumeSeries(
  workouts: Workout[],
  bucket: 'week' | 'month',
  buckets: number,
  weekStartsOn: 0 | 1 = 1,
  now = Date.now(),
): SeriesPoint[] {
  const start = (t: number) => (bucket === 'week' ? startOfWeek(t, weekStartsOn) : startOfMonth(t));
  const step = (t: number, n: number) => (bucket === 'week' ? addDays(t, 7 * n) : addMonths(t, n));
  const current = start(now);
  const points: SeriesPoint[] = [];
  const index = new Map<number, SeriesPoint>();
  for (let i = buckets - 1; i >= 0; i--) {
    const t = step(current, -i);
    const p = { t, value: 0, count: 0 };
    points.push(p);
    index.set(t, p);
  }
  for (const w of workouts) {
    const p = index.get(start(w.startedAt));
    if (!p) continue;
    p.value += workoutStats(w).volume;
    p.count += 1;
  }
  return points;
}

/** Map of day-start → number of workouts that day. */
export function dayCounts(workouts: Workout[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const w of workouts) {
    const d = startOfDay(w.startedAt);
    m.set(d, (m.get(d) ?? 0) + 1);
  }
  return m;
}

export interface MuscleShare {
  muscle: MuscleGroup;
  sets: number; // primary = 1, secondary = 0.5
  volume: number;
}

export function muscleDistribution(
  workouts: Workout[],
  lookup: ExerciseLookup,
  since = 0,
): MuscleShare[] {
  const acc = new Map<MuscleGroup, MuscleShare>(
    MUSCLE_GROUPS.map((m) => [m, { muscle: m, sets: 0, volume: 0 }]),
  );
  for (const w of workouts) {
    if (w.startedAt < since) continue;
    for (const we of w.exercises) {
      const ex = lookup(we.exerciseId);
      if (!ex) continue;
      for (const s of we.sets) {
        if (!isWorkingSet(s)) continue;
        const v = setVolume(s);
        const p = acc.get(ex.primaryMuscle)!;
        p.sets += 1;
        p.volume += v;
        for (const m of ex.secondaryMuscles) {
          const sm = acc.get(m)!;
          sm.sets += 0.5;
          sm.volume += v * 0.5;
        }
      }
    }
  }
  return [...acc.values()].sort((a, b) => b.sets - a.sets);
}

export interface ExerciseSession {
  workoutId: string;
  date: number;
  bestE1RM: number;
  topWeight: number;
  topReps: number;
  volume: number;
  sets: { weight: number; reps: number; type: string; durationSec: number }[];
}

/** One entry per workout that contains the exercise, oldest → newest. */
export function exerciseSessions(workouts: Workout[], exerciseId: string): ExerciseSession[] {
  const out: ExerciseSession[] = [];
  for (const w of workouts) {
    let found = false;
    const sess: ExerciseSession = {
      workoutId: w.id,
      date: w.startedAt,
      bestE1RM: 0,
      topWeight: 0,
      topReps: 0,
      volume: 0,
      sets: [],
    };
    for (const we of w.exercises) {
      if (we.exerciseId !== exerciseId) continue;
      for (const s of we.sets) {
        if (!s.completed) continue;
        found = true;
        const weight = s.weight ?? 0;
        const reps = s.reps ?? 0;
        sess.sets.push({ weight, reps, type: s.type, durationSec: s.durationSec ?? 0 });
        if (s.type === 'warmup') continue;
        sess.volume += weight * reps;
        if (reps <= E1RM_MAX_REPS) sess.bestE1RM = Math.max(sess.bestE1RM, estimate1RM(weight, reps));
        if (weight > sess.topWeight || (weight === sess.topWeight && reps > sess.topReps)) {
          sess.topWeight = weight;
          sess.topReps = reps;
        }
      }
    }
    if (found) out.push(sess);
  }
  return out.sort((a, b) => a.date - b.date);
}

/** Exercise ids ranked by how often they appear (most trained first). */
export function exerciseFrequency(workouts: Workout[]): { exerciseId: string; sessions: number; last: number }[] {
  const m = new Map<string, { exerciseId: string; sessions: number; last: number }>();
  for (const w of workouts) {
    const seen = new Set<string>();
    for (const we of w.exercises) {
      if (seen.has(we.exerciseId) || !we.sets.some((s) => s.completed)) continue;
      seen.add(we.exerciseId);
      const cur = m.get(we.exerciseId) ?? { exerciseId: we.exerciseId, sessions: 0, last: 0 };
      cur.sessions++;
      cur.last = Math.max(cur.last, w.startedAt);
      m.set(we.exerciseId, cur);
    }
  }
  return [...m.values()].sort((a, b) => b.sessions - a.sessions || b.last - a.last);
}

/** Consecutive weeks (ending this week or last week) with at least one workout. */
export function weekStreak(workouts: Workout[], weekStartsOn: 0 | 1 = 1, now = Date.now()): number {
  const weeks = new Set(workouts.map((w) => startOfWeek(w.startedAt, weekStartsOn)));
  let cursor = startOfWeek(now, weekStartsOn);
  if (!weeks.has(cursor)) cursor = addDays(cursor, -7); // current week still in progress
  let streak = 0;
  while (weeks.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -7);
  }
  return streak;
}

export function workoutsBetween(workouts: Workout[], from: number, to: number): Workout[] {
  return workouts.filter((w) => w.startedAt >= from && w.startedAt < to);
}

export function averagePerWeek(workouts: Workout[], weeks: number, now = Date.now()): number {
  const since = now - weeks * 7 * DAY;
  return workouts.filter((w) => w.startedAt >= since).length / weeks;
}
