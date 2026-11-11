import type { AppData, Routine, RoutineExercise, Workout, WorkoutExercise } from '@/domain/types';
import { DEFAULT_PROFILE } from '@/store/app';
import { addDays, DAY, roundTo, startOfDay, uid } from '@/lib/util';

/** Deterministic PRNG so sample data is stable between loads. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Plan {
  id: string;
  sets: number;
  reps: number;
  start: number; // kg at week 0
  gain: number; // kg per week
  rest?: number;
  bw?: boolean;
  warmup?: boolean;
  duration?: number;
}

const DAYS: { name: string; plan: Plan[] }[] = [
  {
    name: 'Push',
    plan: [
      { id: 'bench-press', sets: 4, reps: 6, start: 77.5, gain: 0.9, warmup: true },
      { id: 'incline-db-press', sets: 3, reps: 9, start: 26, gain: 0.35 },
      { id: 'overhead-press', sets: 3, reps: 6, start: 45, gain: 0.45 },
      { id: 'lateral-raise', sets: 3, reps: 14, start: 9, gain: 0.12 },
      { id: 'tricep-pushdown', sets: 3, reps: 12, start: 27.5, gain: 0.3 },
    ],
  },
  {
    name: 'Pull',
    plan: [
      { id: 'deadlift', sets: 3, reps: 5, start: 135, gain: 1.6, warmup: true },
      { id: 'pull-up', sets: 3, reps: 8, start: 0, gain: 0.25, bw: true },
      { id: 'barbell-row', sets: 3, reps: 8, start: 70, gain: 0.7 },
      { id: 'face-pull', sets: 3, reps: 15, start: 20, gain: 0.2 },
      { id: 'hammer-curl', sets: 3, reps: 10, start: 14, gain: 0.15 },
    ],
  },
  {
    name: 'Legs',
    plan: [
      { id: 'back-squat', sets: 4, reps: 5, start: 110, gain: 1.3, warmup: true },
      { id: 'romanian-deadlift', sets: 3, reps: 8, start: 90, gain: 0.8 },
      { id: 'leg-press', sets: 3, reps: 10, start: 180, gain: 2 },
      { id: 'leg-curl', sets: 3, reps: 12, start: 40, gain: 0.35 },
      { id: 'standing-calf-raise', sets: 3, reps: 12, start: 70, gain: 0.6 },
      { id: 'plank', sets: 2, reps: 0, start: 0, gain: 0, duration: 60 },
    ],
  },
];

function routineFor(day: (typeof DAYS)[number], now: number): Routine {
  return {
    id: `sample-${day.name.toLowerCase()}`,
    name: `${day.name} Day`,
    notes: '',
    createdAt: now - 90 * DAY,
    updatedAt: now - 90 * DAY,
    exercises: day.plan.map<RoutineExercise>((p) => ({
      id: uid(),
      exerciseId: p.id,
      notes: '',
      supersetId: null,
      sets: [
        ...(p.warmup ? [{ id: uid(), type: 'warmup' as const, reps: 8, weight: roundTo(p.start * 0.5, 2.5) }] : []),
        ...Array.from({ length: p.sets }, () => ({
          id: uid(),
          type: 'normal' as const,
          reps: p.reps || null,
          durationSec: p.duration ?? null,
        })),
      ],
    })),
  };
}

export function generateSampleData(now = Date.now(), weeks = 14): AppData {
  const rand = rng(42);
  const workouts: Workout[] = [];
  const begin = startOfDay(now) - weeks * 7 * DAY;
  let dayIndex = 0;
  // Mon / Wed / Fri / Sat-ish rhythm, with occasional skipped sessions.
  for (let d = 0; d < weeks * 7; d++) {
    const date = addDays(begin, d);
    const dow = new Date(date).getDay();
    if (![1, 3, 5, 6].includes(dow)) continue;
    if (dow === 6 && rand() < 0.55) continue;
    if (rand() < 0.08) continue; // missed day
    const week = d / 7;
    // A deload-ish dip around week 9 makes the insights more interesting.
    const fatigue = week > 8.5 && week < 10 ? 0.92 : 1;
    const day = DAYS[dayIndex % DAYS.length];
    dayIndex++;
    const start = date + (17 + Math.floor(rand() * 3)) * 3600_000 + Math.floor(rand() * 50) * 60_000;
    let clock = start + 4 * 60_000;
    const exercises: WorkoutExercise[] = day.plan.map((p) => {
      const sets: WorkoutExercise['sets'] = [];
      const work = p.bw ? 0 : roundTo((p.start + p.gain * week) * fatigue, p.start > 30 ? 2.5 : 1);
      if (p.warmup) {
        for (const pct of [0.45, 0.7]) {
          clock += 90_000;
          sets.push({ id: uid(), type: 'warmup', weight: roundTo(work * pct, 2.5), reps: pct < 0.5 ? 10 : 5, durationSec: null, completed: true, completedAt: clock });
        }
      }
      for (let i = 0; i < p.sets; i++) {
        clock += (p.rest ?? 120) * 1000 + Math.floor(rand() * 40_000);
        const drop = i === p.sets - 1 && rand() < 0.35 ? 1 : 0;
        const bonus = p.bw ? Math.floor(week / 4) : 0;
        sets.push({
          id: uid(),
          type: i === p.sets - 1 && rand() < 0.15 ? 'failure' : 'normal',
          weight: p.duration ? null : work,
          reps: p.duration ? null : Math.max(1, p.reps + bonus - drop - (rand() < 0.15 ? 1 : 0)),
          durationSec: p.duration ? p.duration + Math.round(week * 3) : null,
          completed: true,
          completedAt: clock,
        });
      }
      return { id: uid(), exerciseId: p.id, notes: '', supersetId: null, sets };
    });
    workouts.push({
      id: uid(),
      name: `${day.name} Day`,
      routineId: `sample-${day.name.toLowerCase()}`,
      startedAt: start,
      endedAt: clock + 3 * 60_000,
      notes: '',
      exercises,
    });
  }

  const bodyweight = [] as AppData['bodyweight'];
  for (let d = 0; d < weeks * 7; d += 3) {
    const date = addDays(begin, d) + 7 * 3600_000;
    bodyweight.push({ id: uid(), date, weight: Math.round((82.4 + (d / 7) * 0.12 + (rand() - 0.5) * 0.8) * 10) / 10 });
  }

  const routines = DAYS.map((d) => routineFor(d, now)).map((r) => ({
    ...r,
    lastUsedAt: workouts.filter((w) => w.routineId === r.id).reduce<number | undefined>((m, w) => Math.max(m ?? 0, w.startedAt), undefined),
  }));
  return {
    profile: { ...DEFAULT_PROFILE, name: 'Athlete' },
    customExercises: [],
    routines,
    workouts,
    bodyweight,
    active: null,
  };
}
