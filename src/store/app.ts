import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { del, get, set } from 'idb-keyval';
import {
  AppDataSchema,
  type AppData,
  type BodyweightEntry,
  type Exercise,
  type Routine,
  type RoutineExercise,
  type SetType,
  type UserProfile,
  type Workout,
  type WorkoutExercise,
  type WorkoutSet,
} from '@/domain/types';
import { LIBRARY_MAP } from '@/data/exercises';
import { previousSets } from '@/domain/calc';
import { uid } from '@/lib/util';
import { isNative, readMirror, writeMirror } from '@/lib/native';

export const STORAGE_KEY = 'forgetrack:v1';
export const SCHEMA_VERSION = 1;

/** 'active' targets the in-progress workout; any other string is a completed workout id. */
export type Target = 'active' | string;

export const DEFAULT_PROFILE: UserProfile = {
  name: '',
  unit: 'kg',
  defaultRestSec: 120,
  keepAwake: true,
  theme: 'dark',
  sound: true,
  haptics: true,
  weekStartsOn: 1,
  weeklyGoal: 4,
};

const EMPTY: AppData = {
  profile: DEFAULT_PROFILE,
  customExercises: [],
  routines: [],
  workouts: [],
  bodyweight: [],
  active: null,
};

export interface AppState extends AppData {
  hydrated: boolean;

  updateProfile(p: Partial<UserProfile>): void;

  // Exercises
  saveCustomExercise(e: Omit<Exercise, 'id' | 'isCustom'> & { id?: string }): string;
  deleteCustomExercise(id: string): void;

  // Routines
  saveRoutine(r: Routine): void;
  createRoutine(name?: string): string;
  duplicateRoutine(id: string): string | null;
  deleteRoutine(id: string): Routine | null;
  restoreRoutine(r: Routine): void;
  routineFromWorkout(workoutId: Target, name?: string): string | null;

  // Workout lifecycle
  startWorkout(opts?: { routineId?: string; fromWorkoutId?: string; name?: string }): void;
  finishWorkout(): Workout | null;
  discardWorkout(): void;

  // Workout editing (active or completed)
  setWorkoutMeta(t: Target, patch: Partial<Pick<Workout, 'name' | 'notes' | 'startedAt' | 'endedAt'>>): void;
  addExercises(t: Target, exerciseIds: string[]): void;
  removeExercise(t: Target, weId: string): { we: WorkoutExercise; index: number } | null;
  insertExercise(t: Target, we: WorkoutExercise, index: number): void;
  reorderExercises(t: Target, ids: string[]): void;
  replaceExercise(t: Target, weId: string, exerciseId: string): void;
  setExerciseField(t: Target, weId: string, patch: Partial<Pick<WorkoutExercise, 'notes' | 'restSec'>>): void;
  toggleSuperset(t: Target, weId: string): void;
  addSet(t: Target, weId: string): void;
  removeSet(t: Target, weId: string, setId: string): { set: WorkoutSet; index: number } | null;
  insertSet(t: Target, weId: string, s: WorkoutSet, index: number): void;
  updateSet(t: Target, weId: string, setId: string, patch: Partial<WorkoutSet>): void;
  setSetType(t: Target, weId: string, setId: string, type: SetType): void;
  reorderSets(t: Target, weId: string, ids: string[]): void;

  // History
  deleteWorkout(id: string): Workout | null;
  restoreWorkout(w: Workout): void;

  // Bodyweight
  addBodyweight(weightKg: number, date?: number): void;
  deleteBodyweight(id: string): void;

  // Data
  replaceAll(d: AppData): void;
  resetAll(): void;
}

export function getExercise(id: string, custom: Exercise[]): Exercise | undefined {
  return LIBRARY_MAP.get(id) ?? custom.find((e) => e.id === id);
}

function newSet(type: SetType = 'normal', from?: Partial<WorkoutSet>): WorkoutSet {
  return {
    id: uid(),
    type,
    weight: from?.weight ?? null,
    reps: from?.reps ?? null,
    durationSec: from?.durationSec ?? null,
    completed: false,
  };
}

function workoutExerciseFrom(re: RoutineExercise): WorkoutExercise {
  return {
    id: uid(),
    exerciseId: re.exerciseId,
    restSec: re.restSec,
    notes: re.notes,
    supersetId: re.supersetId ?? null,
    sets: re.sets.map((s) => newSet(s.type, s)),
  };
}

/** Blank exercise entry — set count follows last session (min 3) so the table is ready to go. */
function blankWorkoutExercise(exerciseId: string, workouts: Workout[]): WorkoutExercise {
  const prev = previousSets(workouts, exerciseId);
  const n = prev ? Math.max(1, prev.length) : 3;
  return {
    id: uid(),
    exerciseId,
    notes: '',
    supersetId: null,
    sets: Array.from({ length: n }, (_, i) => newSet(prev?.[i]?.type ?? 'normal')),
  };
}

type Linkable = { supersetId?: string | null };
/** links[i] = exercise i is in the same superset as exercise i+1. */
export function linksOf(list: Linkable[]): boolean[] {
  return list.slice(0, -1).map((e, i) => !!e.supersetId && e.supersetId === list[i + 1].supersetId);
}
/** Reassign superset ids from adjacency links; singletons get null. */
export function applyLinks<T extends Linkable>(list: T[], links: boolean[]): T[] {
  const out: T[] = [];
  const used = new Set<string>();
  let i = 0;
  while (i < list.length) {
    let j = i;
    while (j < list.length - 1 && links[j]) j++;
    let gid: string | null = null;
    if (j > i) {
      const keep = list[i].supersetId;
      gid = keep && !used.has(keep) ? keep : uid();
      used.add(gid);
    }
    for (let k = i; k <= j; k++) out.push(list[k].supersetId === gid ? list[k] : { ...list[k], supersetId: gid });
    i = j + 1;
  }
  return out;
}

/**
 * IndexedDB storage with write coalescing: typing in a set field updates state on every
 * keystroke, but we persist at most every 250 ms and always flush when the page is hidden.
 */
const pending = new Map<string, string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let mirrorTimer: ReturnType<typeof setTimeout> | null = null;
let mirrorValue: string | null = null;
function flush() {
  flushTimer = null;
  for (const [k, v] of pending) {
    void set(k, v);
    if (isNative && k === STORAGE_KEY) mirrorValue = v;
  }
  pending.clear();
  // The on-device file mirror (iOS only) is written less often than IndexedDB.
  if (mirrorValue != null && !mirrorTimer) mirrorTimer = setTimeout(flushMirror, 1500);
}
function flushMirror() {
  mirrorTimer = null;
  if (mirrorValue == null) return;
  const v = mirrorValue;
  mirrorValue = null;
  void writeMirror(v);
}
if (typeof window !== 'undefined') {
  const flushAll = () => {
    flush();
    if (mirrorTimer) clearTimeout(mirrorTimer);
    flushMirror();
  };
  window.addEventListener('pagehide', flushAll);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flushAll());
}
const idbStorage: StateStorage = {
  getItem: async (name) => {
    const v = (await get<string>(name)) ?? null;
    if (v != null || name !== STORAGE_KEY) return v;
    // IndexedDB empty: on iPhone, recover from the on-device mirror if one exists.
    const mirrored = await readMirror();
    if (mirrored != null) void set(name, mirrored);
    return mirrored;
  },
  setItem: (name, value) => {
    pending.set(name, value);
    flushTimer ??= setTimeout(flush, 250);
  },
  removeItem: async (name) => {
    pending.delete(name);
    await del(name);
  },
};

export const useApp = create<AppState>()(
  persist(
    (setState, getState) => {
      /** Apply an immutable update to the targeted workout. */
      const mutate = (t: Target, fn: (w: Workout) => Workout) => {
        setState((s) => {
          if (t === 'active') return s.active ? { active: fn(s.active) } : {};
          return { workouts: s.workouts.map((w) => (w.id === t ? fn(w) : w)) };
        });
      };
      const mutateEx = (t: Target, weId: string, fn: (we: WorkoutExercise) => WorkoutExercise) =>
        mutate(t, (w) => ({ ...w, exercises: w.exercises.map((e) => (e.id === weId ? fn(e) : e)) }));
      const readTarget = (t: Target) => {
        const s = getState();
        return t === 'active' ? s.active : s.workouts.find((w) => w.id === t) ?? null;
      };

      return {
        ...EMPTY,
        hydrated: false,

        updateProfile: (p) => setState((s) => ({ profile: { ...s.profile, ...p } })),

        saveCustomExercise: (e) => {
          const id = e.id ?? `custom-${uid()}`;
          const ex: Exercise = { ...e, id, isCustom: true };
          setState((s) => ({
            customExercises: s.customExercises.some((c) => c.id === id)
              ? s.customExercises.map((c) => (c.id === id ? ex : c))
              : [...s.customExercises, ex],
          }));
          return id;
        },
        deleteCustomExercise: (id) => setState((s) => ({ customExercises: s.customExercises.filter((c) => c.id !== id) })),

        saveRoutine: (r) =>
          setState((s) => ({
            routines: s.routines.some((x) => x.id === r.id)
              ? s.routines.map((x) => (x.id === r.id ? { ...r, updatedAt: Date.now() } : x))
              : [...s.routines, r],
          })),
        createRoutine: (name = 'New routine') => {
          const now = Date.now();
          const r: Routine = { id: uid(), name, notes: '', exercises: [], createdAt: now, updatedAt: now };
          setState((s) => ({ routines: [...s.routines, r] }));
          return r.id;
        },
        duplicateRoutine: (id) => {
          const src = getState().routines.find((r) => r.id === id);
          if (!src) return null;
          const now = Date.now();
          const groupMap = new Map<string, string>();
          const copy: Routine = {
            ...src,
            id: uid(),
            name: `${src.name} (copy)`,
            createdAt: now,
            updatedAt: now,
            lastUsedAt: undefined,
            exercises: src.exercises.map((e) => ({
              ...e,
              id: uid(),
              supersetId: e.supersetId ? (groupMap.get(e.supersetId) ?? groupMap.set(e.supersetId, uid()).get(e.supersetId)) : null,
              sets: e.sets.map((x) => ({ ...x, id: uid() })),
            })),
          };
          setState((s) => {
            const i = s.routines.findIndex((r) => r.id === id);
            const routines = s.routines.slice();
            routines.splice(i + 1, 0, copy);
            return { routines };
          });
          return copy.id;
        },
        deleteRoutine: (id) => {
          const r = getState().routines.find((x) => x.id === id) ?? null;
          setState((s) => ({ routines: s.routines.filter((x) => x.id !== id) }));
          return r;
        },
        restoreRoutine: (r) => setState((s) => ({ routines: [...s.routines, r] })),
        routineFromWorkout: (t, name) => {
          const w = readTarget(t);
          if (!w) return null;
          const now = Date.now();
          const r: Routine = {
            id: uid(),
            name: (name ?? w.name) || 'Saved routine',
            notes: w.notes,
            createdAt: now,
            updatedAt: now,
            exercises: w.exercises.map((e) => {
              const done = e.sets.filter((s) => s.completed);
              const sets = done.length ? done : e.sets;
              return {
                id: uid(),
                exerciseId: e.exerciseId,
                restSec: e.restSec,
                notes: e.notes,
                supersetId: e.supersetId ?? null,
                sets: sets.map((s) => ({ id: uid(), type: s.type, weight: s.weight, reps: s.reps, durationSec: s.durationSec })),
              };
            }),
          };
          setState((s) => ({ routines: [...s.routines, r] }));
          return r.id;
        },

        startWorkout: (opts = {}) => {
          const s = getState();
          if (s.active) return;
          const now = Date.now();
          let exercises: WorkoutExercise[] = [];
          let name = opts.name ?? '';
          let routineId: string | undefined;
          if (opts.routineId) {
            const r = s.routines.find((x) => x.id === opts.routineId);
            if (r) {
              routineId = r.id;
              name = r.name;
              exercises = r.exercises.map(workoutExerciseFrom);
            }
          } else if (opts.fromWorkoutId) {
            const src = s.workouts.find((x) => x.id === opts.fromWorkoutId);
            if (src) {
              name = src.name;
              routineId = src.routineId;
              exercises = src.exercises.map((e) => ({
                ...e,
                id: uid(),
                sets: e.sets.filter((x) => x.completed).map((x) => newSet(x.type)),
              }));
            }
          }
          if (!name) {
            const h = new Date(now).getHours();
            name = h < 4 ? 'Night session' : h < 11 ? 'Morning session' : h < 17 ? 'Afternoon session' : 'Evening session';
          }
          setState({
            active: { id: uid(), name, routineId, startedAt: now, notes: '', exercises },
            routines: routineId
              ? s.routines.map((r) => (r.id === routineId ? { ...r, lastUsedAt: now } : r))
              : s.routines,
          });
        },
        finishWorkout: () => {
          const { active } = getState();
          if (!active) return null;
          // Keep only completed sets; drop exercises with nothing logged.
          const exercises = active.exercises
            .map((e) => ({ ...e, sets: e.sets.filter((x) => x.completed) }))
            .filter((e) => e.sets.length > 0);
          const done: Workout = { ...active, exercises, endedAt: Date.now() };
          if (exercises.length === 0) {
            setState({ active: null });
            return null;
          }
          setState((s) => ({ active: null, workouts: [...s.workouts, done] }));
          return done;
        },
        discardWorkout: () => setState({ active: null }),

        setWorkoutMeta: (t, patch) => mutate(t, (w) => ({ ...w, ...patch })),
        addExercises: (t, ids) => {
          const workouts = getState().workouts;
          mutate(t, (w) => ({ ...w, exercises: [...w.exercises, ...ids.map((id) => blankWorkoutExercise(id, workouts))] }));
        },
        removeExercise: (t, weId) => {
          const w = readTarget(t);
          const index = w?.exercises.findIndex((e) => e.id === weId) ?? -1;
          if (!w || index < 0) return null;
          const we = w.exercises[index];
          mutate(t, (x) => ({ ...x, exercises: x.exercises.filter((e) => e.id !== weId) }));
          return { we, index };
        },
        insertExercise: (t, we, index) =>
          mutate(t, (w) => {
            const exercises = w.exercises.slice();
            exercises.splice(Math.min(index, exercises.length), 0, we);
            return { ...w, exercises };
          }),
        reorderExercises: (t, ids) =>
          mutate(t, (w) => {
            const byId = new Map(w.exercises.map((e) => [e.id, e]));
            const ordered = ids.map((id) => byId.get(id)).filter(Boolean) as WorkoutExercise[];
            // Supersets must be contiguous — links survive only between still-adjacent members.
            return { ...w, exercises: applyLinks(ordered, linksOf(ordered)) };
          }),
        replaceExercise: (t, weId, exerciseId) => mutateEx(t, weId, (e) => ({ ...e, exerciseId })),
        setExerciseField: (t, weId, patch) => mutateEx(t, weId, (e) => ({ ...e, ...patch })),
        toggleSuperset: (t, weId) =>
          mutate(t, (w) => {
            const i = w.exercises.findIndex((e) => e.id === weId);
            if (i < 0 || i >= w.exercises.length - 1) return w;
            const links = linksOf(w.exercises);
            links[i] = !links[i];
            return { ...w, exercises: applyLinks(w.exercises, links) };
          }),
        addSet: (t, weId) =>
          mutateEx(t, weId, (e) => {
            const last = e.sets[e.sets.length - 1];
            const type = last && last.type !== 'warmup' ? last.type : 'normal';
            return { ...e, sets: [...e.sets, newSet(type, last ? { weight: last.weight, reps: last.reps, durationSec: last.durationSec } : undefined)] };
          }),
        removeSet: (t, weId, setId) => {
          const we = readTarget(t)?.exercises.find((e) => e.id === weId);
          const index = we?.sets.findIndex((x) => x.id === setId) ?? -1;
          if (!we || index < 0) return null;
          const removed = we.sets[index];
          mutateEx(t, weId, (e) => ({ ...e, sets: e.sets.filter((x) => x.id !== setId) }));
          return { set: removed, index };
        },
        insertSet: (t, weId, s, index) =>
          mutateEx(t, weId, (e) => {
            const sets = e.sets.slice();
            sets.splice(Math.min(index, sets.length), 0, s);
            return { ...e, sets };
          }),
        updateSet: (t, weId, setId, patch) =>
          mutateEx(t, weId, (e) => ({ ...e, sets: e.sets.map((x) => (x.id === setId ? { ...x, ...patch } : x)) })),
        setSetType: (t, weId, setId, type) =>
          mutateEx(t, weId, (e) => ({ ...e, sets: e.sets.map((x) => (x.id === setId ? { ...x, type } : x)) })),
        reorderSets: (t, weId, ids) =>
          mutateEx(t, weId, (e) => {
            const byId = new Map(e.sets.map((x) => [x.id, x]));
            return { ...e, sets: ids.map((id) => byId.get(id)).filter(Boolean) as WorkoutSet[] };
          }),

        deleteWorkout: (id) => {
          const w = getState().workouts.find((x) => x.id === id) ?? null;
          setState((s) => ({ workouts: s.workouts.filter((x) => x.id !== id) }));
          return w;
        },
        restoreWorkout: (w) => setState((s) => ({ workouts: [...s.workouts, w] })),

        addBodyweight: (weight, date = Date.now()) => {
          const entry: BodyweightEntry = { id: uid(), weight, date };
          setState((s) => ({ bodyweight: [...s.bodyweight, entry].sort((a, b) => a.date - b.date) }));
        },
        deleteBodyweight: (id) => setState((s) => ({ bodyweight: s.bodyweight.filter((b) => b.id !== id) })),

        replaceAll: (d) => setState({ ...d }),
        resetAll: () => setState({ ...EMPTY }),
      };
    },
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => idbStorage),
      partialize: (s): AppData => ({
        profile: s.profile,
        customExercises: s.customExercises,
        routines: s.routines,
        workouts: s.workouts,
        bodyweight: s.bodyweight,
        active: s.active,
      }),
      merge: (persisted, current) => {
        const parsed = AppDataSchema.safeParse(persisted);
        if (parsed.success) return { ...current, ...parsed.data };
        // Never drop user data because of a schema hiccup — fall back to a shallow merge.
        console.warn('[forgetrack] persisted data failed validation', parsed.error?.issues?.slice(0, 3));
        return { ...current, ...(persisted as Partial<AppData>) };
      },
      onRehydrateStorage: () => () => {
        useApp.setState({ hydrated: true });
      },
    },
  ),
);

/** Snapshot the persistable part of state (for export). */
export function snapshot(): AppData {
  const s = useApp.getState();
  return {
    profile: s.profile,
    customExercises: s.customExercises,
    routines: s.routines,
    workouts: s.workouts,
    bodyweight: s.bodyweight,
    active: s.active,
  };
}
