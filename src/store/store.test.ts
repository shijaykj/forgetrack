import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { applyLinks, linksOf, useApp } from './app';
import { timerRemaining, useTimer } from './timer';

const S = () => useApp.getState();

beforeEach(() => {
  S().resetAll();
});

describe('workout flow', () => {
  it('routine → workout → finish → history → save as routine', () => {
    const rid = S().createRoutine('Push Day');
    const r = S().routines.find((x) => x.id === rid)!;
    S().saveRoutine({
      ...r,
      exercises: [
        { id: 'a', exerciseId: 'bench-press', notes: '', sets: [{ id: 's1', type: 'normal', reps: 8, weight: 80 }, { id: 's2', type: 'normal', reps: 8, weight: 80 }] },
      ],
    });
    S().startWorkout({ routineId: rid });
    const active = S().active!;
    expect(active.name).toBe('Push Day');
    expect(active.exercises[0].sets).toHaveLength(2);
    expect(S().routines[0].lastUsedAt).toBeDefined();

    const we = active.exercises[0];
    S().updateSet('active', we.id, we.sets[0].id, { completed: true, completedAt: Date.now() });
    S().addExercises('active', ['back-squat']);
    expect(S().active!.exercises).toHaveLength(2);

    const done = S().finishWorkout()!;
    // Unlogged sets and empty exercises are dropped.
    expect(done.exercises).toHaveLength(1);
    expect(done.exercises[0].sets).toHaveLength(1);
    expect(S().active).toBeNull();
    expect(S().workouts).toHaveLength(1);

    const newId = S().routineFromWorkout(done.id, 'From history')!;
    expect(S().routines.find((x) => x.id === newId)!.exercises[0].sets).toHaveLength(1);
  });

  it('finishing an empty workout discards it', () => {
    S().startWorkout();
    expect(S().finishWorkout()).toBeNull();
    expect(S().workouts).toHaveLength(0);
  });

  it('remove + reinsert set supports undo', () => {
    S().startWorkout();
    S().addExercises('active', ['bench-press']);
    const we = S().active!.exercises[0];
    const removed = S().removeSet('active', we.id, we.sets[1].id)!;
    expect(S().active!.exercises[0].sets).toHaveLength(2);
    S().insertSet('active', we.id, removed.set, removed.index);
    expect(S().active!.exercises[0].sets.map((s) => s.id)).toEqual(we.sets.map((s) => s.id));
  });

  it('edits completed workouts in place', () => {
    S().startWorkout();
    S().addExercises('active', ['bench-press']);
    const we = S().active!.exercises[0];
    S().updateSet('active', we.id, we.sets[0].id, { weight: 50, reps: 5, completed: true });
    const done = S().finishWorkout()!;
    S().updateSet(done.id, done.exercises[0].id, done.exercises[0].sets[0].id, { weight: 60 });
    expect(S().workouts[0].exercises[0].sets[0].weight).toBe(60);
  });

  it('duplicates routines with fresh ids', () => {
    const rid = S().createRoutine('A');
    const copy = S().duplicateRoutine(rid)!;
    expect(copy).not.toBe(rid);
    expect(S().routines).toHaveLength(2);
    expect(S().routines[1].name).toBe('A (copy)');
  });
});

describe('supersets', () => {
  it('links and splits groups by adjacency', () => {
    const list = [{ supersetId: null }, { supersetId: null }, { supersetId: null }];
    const linked = applyLinks(list, [true, true]);
    expect(new Set(linked.map((e) => e.supersetId)).size).toBe(1);
    const split = applyLinks(linked, [true, false]);
    expect(split[0].supersetId).toBe(split[1].supersetId);
    expect(split[2].supersetId).toBeNull();
    expect(linksOf(split)).toEqual([true, false]);
    // Splitting a 4-group in the middle yields two distinct groups.
    const blank = (): { supersetId?: string | null } => ({});
    const four = applyLinks([blank(), blank(), blank(), blank()], [true, true, true]);
    const halves = applyLinks(four, [true, false, true]);
    expect(halves[0].supersetId).not.toBe(halves[2].supersetId);
    expect(linksOf(halves)).toEqual([true, false, true]);
  });
});

describe('rest timer', () => {
  it('counts from an absolute timestamp and supports pause/add/skip', () => {
    const t = useTimer.getState();
    t.start(90, 'Bench');
    const r1 = timerRemaining(useTimer.getState());
    expect(r1).toBeGreaterThan(89_000);
    useTimer.getState().add(30);
    expect(timerRemaining(useTimer.getState())).toBeGreaterThan(119_000);
    useTimer.getState().pause();
    const paused = useTimer.getState().pausedRemaining!;
    expect(useTimer.getState().endsAt).toBeNull();
    useTimer.getState().resume();
    expect(Math.abs(timerRemaining(useTimer.getState()) - paused)).toBeLessThan(50);
    useTimer.getState().skip();
    expect(timerRemaining(useTimer.getState())).toBe(0);
  });
});
