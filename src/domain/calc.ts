import type { Exercise, PersonalRecord, PRKind, Workout, WorkoutExercise, WorkoutSet } from './types';

/** Epley estimated one-rep max. Returns 0 for invalid input. */
export function estimate1RM(weight: number, reps: number): number {
  if (!(weight > 0) || !(reps > 0)) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}
/** e1RM loses accuracy at high reps; records only consider ≤ 12 reps. */
export const E1RM_MAX_REPS = 12;

export function isWorkingSet(s: WorkoutSet): boolean {
  return s.completed && s.type !== 'warmup';
}

export function setVolume(s: Pick<WorkoutSet, 'weight' | 'reps'>): number {
  return (s.weight ?? 0) * (s.reps ?? 0);
}

export function exerciseVolume(we: WorkoutExercise): number {
  let v = 0;
  for (const s of we.sets) if (isWorkingSet(s)) v += setVolume(s);
  return v;
}

export interface WorkoutStats {
  volume: number;
  sets: number;
  reps: number;
  exercises: number;
  durationMs: number;
}

export function workoutStats(w: Workout, now = Date.now()): WorkoutStats {
  let volume = 0;
  let sets = 0;
  let reps = 0;
  let exercises = 0;
  for (const we of w.exercises) {
    let any = false;
    for (const s of we.sets) {
      if (!s.completed) continue;
      any = true;
      if (s.type === 'warmup') continue;
      sets++;
      reps += s.reps ?? 0;
      volume += setVolume(s);
    }
    if (any) exercises++;
  }
  return { volume, sets, reps, exercises, durationMs: (w.endedAt ?? now) - w.startedAt };
}

/** Sort completed workouts newest first. */
export function sortNewest(workouts: Workout[]): Workout[] {
  return workouts.slice().sort((a, b) => b.startedAt - a.startedAt);
}

/** Previous performance: completed sets from the most recent workout containing the exercise. */
export function previousSets(
  workouts: Workout[],
  exerciseId: string,
  excludeWorkoutId?: string,
  before = Infinity,
): WorkoutSet[] | null {
  let best: Workout | null = null;
  for (const w of workouts) {
    if (w.id === excludeWorkoutId || w.startedAt >= before) continue;
    if (best && w.startedAt <= best.startedAt) continue;
    if (w.exercises.some((e) => e.exerciseId === exerciseId && e.sets.some((s) => s.completed))) best = w;
  }
  if (!best) return null;
  const sets: WorkoutSet[] = [];
  for (const e of best.exercises) if (e.exerciseId === exerciseId) sets.push(...e.sets.filter((s) => s.completed));
  return sets;
}

export type RecordBook = Map<string, Partial<Record<PRKind, PersonalRecord>>>;

function prValue(kind: PRKind, s: WorkoutSet): number {
  const w = s.weight ?? 0;
  const r = s.reps ?? 0;
  switch (kind) {
    case 'weight':
      return r > 0 ? w : 0;
    case 'e1rm':
      return r <= E1RM_MAX_REPS ? estimate1RM(w, r) : 0;
    case 'volume':
      return w * r;
    case 'reps':
      return r;
  }
}

const KINDS: PRKind[] = ['weight', 'e1rm', 'volume', 'reps'];

/** Kinds that make sense for an exercise's tracking type. */
export function kindsFor(tracking: Exercise['tracking']): PRKind[] {
  if (tracking === 'duration') return [];
  if (tracking === 'bodyweight_reps') return ['reps', 'weight'];
  return KINDS;
}

/**
 * Build the record book (best of each kind per exercise) and, as a by-product,
 * the list of every record-setting event in chronological order.
 */
export function computeRecords(workouts: Workout[]): { book: RecordBook; events: PersonalRecord[] } {
  const book: RecordBook = new Map();
  const events: PersonalRecord[] = [];
  const chronological = workouts.slice().sort((a, b) => a.startedAt - b.startedAt);
  for (const w of chronological) {
    for (const we of w.exercises) {
      for (const s of we.sets) {
        if (!isWorkingSet(s) || !(s.reps && s.reps > 0)) continue;
        let entry = book.get(we.exerciseId);
        if (!entry) {
          entry = {};
          book.set(we.exerciseId, entry);
        }
        for (const kind of KINDS) {
          const value = prValue(kind, s);
          if (value <= 0) continue;
          const cur = entry[kind];
          if (!cur || value > cur.value + 1e-9) {
            const rec: PersonalRecord = {
              exerciseId: we.exerciseId,
              kind,
              value,
              weight: s.weight ?? 0,
              reps: s.reps ?? 0,
              workoutId: w.id,
              setId: s.id,
              date: s.completedAt ?? w.startedAt,
            };
            // The first ever entry is a baseline, not an "event" worth celebrating.
            if (cur) events.push(rec);
            entry[kind] = rec;
          }
        }
      }
    }
  }
  return { book, events };
}

/** Which record kinds a candidate set would beat, given a record book. */
export function prKindsForSet(
  book: RecordBook,
  exerciseId: string,
  s: Pick<WorkoutSet, 'weight' | 'reps' | 'type' | 'completed'>,
  allowed: PRKind[] = KINDS,
): PRKind[] {
  if (s.type === 'warmup' || !(s.reps && s.reps > 0)) return [];
  const entry = book.get(exerciseId);
  if (!entry) return []; // first time doing it — nothing to beat
  const out: PRKind[] = [];
  for (const kind of allowed) {
    const value = prValue(kind, s as WorkoutSet);
    const cur = entry[kind];
    if (value > 0 && cur && value > cur.value + 1e-9) out.push(kind);
  }
  return out;
}

/** PR event counts per workout id. */
export function prCountByWorkout(events: PersonalRecord[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of events) m.set(e.workoutId, (m.get(e.workoutId) ?? 0) + 1);
  return m;
}

export const PR_LABEL: Record<PRKind, string> = {
  weight: 'Heaviest weight',
  e1rm: 'Best est. 1RM',
  volume: 'Best set volume',
  reps: 'Most reps',
};
export const PR_SHORT: Record<PRKind, string> = {
  weight: 'Weight',
  e1rm: 'e1RM',
  volume: 'Volume',
  reps: 'Reps',
};

/**
 * Flag which sets of `workout` set a record relative to everything logged before it
 * (and earlier sets within the same workout). Returns setId → kinds beaten.
 */
export function flagWorkoutPRs(
  history: Workout[],
  workout: Workout,
  trackingOf: (exerciseId: string) => Exercise['tracking'] | undefined,
): Map<string, PRKind[]> {
  const prior = history.filter((w) => w.id !== workout.id && w.startedAt < workout.startedAt);
  const { book } = computeRecords(prior);
  const seenBefore = new Set(book.keys()); // no PRs on an exercise's very first session
  const out = new Map<string, PRKind[]>();
  for (const we of workout.exercises) {
    const allowed = kindsFor(trackingOf(we.exerciseId) ?? 'weight_reps');
    for (const s of we.sets) {
      if (!isWorkingSet(s) || !(s.reps && s.reps > 0)) continue;
      const kinds = prKindsForSet(book, we.exerciseId, s, allowed);
      if (kinds.length && seenBefore.has(we.exerciseId)) out.set(s.id, kinds);
      // Fold this set into the running book so later sets must beat it.
      let entry = book.get(we.exerciseId);
      if (!entry) {
        entry = {};
        book.set(we.exerciseId, entry);
      }
      for (const kind of KINDS) {
        const value = prValue(kind, s);
        const cur = entry[kind];
        if (value > 0 && (!cur || value > cur.value))
          entry[kind] = { exerciseId: we.exerciseId, kind, value, weight: s.weight ?? 0, reps: s.reps ?? 0, workoutId: workout.id, setId: s.id, date: s.completedAt ?? workout.startedAt };
      }
    }
  }
  return out;
}
