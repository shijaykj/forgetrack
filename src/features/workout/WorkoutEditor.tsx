import { createContext, memo, useCallback, useContext, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, Reorder, useDragControls } from 'framer-motion';
import type { Exercise, PRKind, SetType, Workout, WorkoutExercise, WorkoutSet } from '@/domain/types';
import { useApp, type Target } from '@/store/app';
import { useTimer } from '@/store/timer';
import { toast, useUI } from '@/store/ui';
import { useExerciseLookup, useIsDesktop } from '@/lib/hooks';
import { haptic, tick } from '@/lib/feedback';
import { E1RM_MAX_REPS, estimate1RM, exerciseVolume, flagWorkoutPRs, previousSets } from '@/domain/calc';
import { MUSCLE_LABEL } from '@/data/exercises';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/ui';
import { Menu, MenuItem, MenuLabel, MenuSep } from '@/components/Menu';
import { cx, fmtClock, fmtVolume, fmtWeight } from '@/lib/util';
import { SetRow, type Ghost } from './SetRow';
import { ExercisePicker } from '../exercises/ExercisePicker';

interface Ctx {
  target: Target;
  live: boolean;
  workout: Workout;
  prFlags: Map<string, PRKind[]>;
  upNextId?: string;
}
const WorkoutCtx = createContext<Ctx | null>(null);
const useWorkoutCtx = () => useContext(WorkoutCtx)!;

const REST_OPTIONS = [0, 30, 45, 60, 90, 120, 150, 180, 240, 300];

/** Shared editor for the live workout and for editing a completed one. */
export function WorkoutEditor({ target, workout, live }: { target: Target; workout: Workout; live: boolean }) {
  const history = useApp((s) => s.workouts);
  const lookup = useExerciseLookup();
  const [reorder, setReorder] = useState(false);
  const [picker, setPicker] = useState(false);
  const reorderExercises = useApp((s) => s.reorderExercises);
  const addExercises = useApp((s) => s.addExercises);

  const prFlags = useMemo(
    () => flagWorkoutPRs(history, workout, (id) => lookup(id)?.tracking),
    [history, workout, lookup],
  );
  // One "up next" set for the whole session: continue after the most recently logged set.
  const upNextId = useMemo(() => {
    if (!live) return undefined;
    let lastEx = -1;
    let lastAt = -1;
    workout.exercises.forEach((e, i) => e.sets.forEach((x) => x.completed && (x.completedAt ?? 0) > lastAt && ((lastAt = x.completedAt ?? 0), (lastEx = i))));
    const order = lastEx < 0 ? workout.exercises : [...workout.exercises.slice(lastEx), ...workout.exercises.slice(0, lastEx)];
    // Inside a superset, the round continues on the next member.
    const gid = lastEx >= 0 ? workout.exercises[lastEx].supersetId : null;
    if (gid) {
      const members = workout.exercises.filter((e) => e.supersetId === gid);
      const idx = members.indexOf(workout.exercises[lastEx]);
      for (const e of [...members.slice(idx + 1), ...members.slice(0, idx + 1)]) {
        const n = e.sets.find((x) => !x.completed);
        if (n) return n.id;
      }
    }
    for (const e of order) {
      const n = e.sets.find((x) => !x.completed);
      if (n) return n.id;
    }
    return undefined;
  }, [workout, live]);
  const ctx = useMemo(() => ({ target, live, workout, prFlags, upNextId }), [target, live, workout, prFlags, upNextId]);

  return (
    <WorkoutCtx.Provider value={ctx}>
      {workout.exercises.length === 0 ? (
        <div className="wo-empty">
          <div className="wo-empty-mark" aria-hidden="true">
            <Icon name="dumbbell" size={30} />
          </div>
          <h3>Add your first exercise</h3>
          <p className="muted">Search the library or create your own. Previous numbers load automatically.</p>
          <Button variant="primary" size="lg" icon="plus" onClick={() => setPicker(true)}>
            Add exercises
          </Button>
        </div>
      ) : reorder ? (
        <ReorderList workout={workout} onDone={(ids) => (reorderExercises(target, ids), setReorder(false))} />
      ) : (
        <div className="wo-list">
          <AnimatePresence initial={false}>
            {workout.exercises.map((we, i) => (
              <ExerciseBlock
                key={we.id}
                we={we}
                index={i}
                linkedPrev={!!we.supersetId && workout.exercises[i - 1]?.supersetId === we.supersetId}
                linkedNext={!!we.supersetId && workout.exercises[i + 1]?.supersetId === we.supersetId}
                isLast={i === workout.exercises.length - 1}
                onReorder={() => setReorder(true)}
              />
            ))}
          </AnimatePresence>
          <div className="wo-add">
            <Button size="lg" icon="plus" block onClick={() => setPicker(true)}>
              Add exercises
            </Button>
          </div>
        </div>
      )}
      <ExercisePicker
        open={picker}
        onClose={() => setPicker(false)}
        onPick={(ids) => {
          addExercises(target, ids);
          setPicker(false);
          haptic(8);
          requestAnimationFrame(() =>
            document.querySelector('.wo-list > .ex-block:last-of-type')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
          );
        }}
      />
    </WorkoutCtx.Provider>
  );
}

function ReorderList({ workout, onDone }: { workout: Workout; onDone: (ids: string[]) => void }) {
  const lookup = useExerciseLookup();
  const [ids, setIds] = useState(() => workout.exercises.map((e) => e.id));
  const byId = new Map(workout.exercises.map((e) => [e.id, e]));
  return (
    <div className="reorder">
      <div className="row-between reorder-head">
        <div>
          <div className="eyebrow">Reorder</div>
          <p className="muted" style={{ fontSize: 13.5 }}>
            Drag to change the order. Superset links survive between neighbours.
          </p>
        </div>
        <Button variant="primary" size="sm" icon="check" onClick={() => onDone(ids)}>
          Done
        </Button>
      </div>
      <Reorder.Group axis="y" values={ids} onReorder={setIds} className="reorder-list">
        {ids.map((id) => (
          <ReorderRow key={id} id={id} name={lookup(byId.get(id)!.exerciseId)?.name ?? 'Exercise'} sets={byId.get(id)!.sets.length} />
        ))}
      </Reorder.Group>
    </div>
  );
}

function ReorderRow({ id, name, sets }: { id: string; name: string; sets: number }) {
  const controls = useDragControls();
  return (
    <Reorder.Item value={id} dragListener={false} dragControls={controls} className="reorder-item" whileDrag={{ scale: 1.02, boxShadow: 'var(--shadow-lg)' }}>
      <span className="reorder-grip" onPointerDown={(e) => controls.start(e)} aria-label="Drag handle" style={{ touchAction: 'none' }}>
        <Icon name="grip" size={20} />
      </span>
      <span className="truncate" style={{ flex: 1, fontWeight: 650 }}>
        {name}
      </span>
      <span className="faint num" style={{ fontSize: 13 }}>
        {sets} sets
      </span>
    </Reorder.Item>
  );
}

const ExerciseBlock = memo(function ExerciseBlock({
  we,
  index,
  linkedPrev,
  linkedNext,
  isLast,
  onReorder,
}: {
  we: WorkoutExercise;
  index: number;
  linkedPrev: boolean;
  linkedNext: boolean;
  isLast: boolean;
  onReorder: () => void;
}) {
  const { target, live, workout, prFlags, upNextId } = useWorkoutCtx();
  const lookup = useExerciseLookup();
  const exercise = lookup(we.exerciseId) ?? fallbackExercise(we.exerciseId);
  const history = useApp((s) => s.workouts);
  const unit = useApp((s) => s.profile.unit);
  const defaultRest = useApp((s) => s.profile.defaultRestSec);
  const actions = useApp.getState();
  const isDesktop = useIsDesktop();
  const [showNotes, setShowNotes] = useState(!!we.notes);
  const [replace, setReplace] = useState(false);

  const prev = useMemo(
    () => previousSets(history, we.exerciseId, workout.id, live ? Infinity : workout.startedAt),
    [history, we.exerciseId, workout.id, workout.startedAt, live],
  );
  const restSec = we.restSec ?? exercise.defaultRestSec ?? defaultRest;
  const volume = exerciseVolume(we);
  const bestE1 = useMemo(() => {
    let b = 0;
    for (const w of history)
      if (w.id !== workout.id)
        for (const e of w.exercises)
          if (e.exerciseId === we.exerciseId)
            for (const s of e.sets) if (s.completed && s.type !== 'warmup' && (s.reps ?? 0) <= E1RM_MAX_REPS) b = Math.max(b, estimate1RM(s.weight ?? 0, s.reps ?? 0));
    return b;
  }, [history, we.exerciseId, workout.id]);
  const done = we.sets.filter((s) => s.completed).length;
  const prCount = we.sets.filter((s) => prFlags.has(s.id)).length;

  // Align previous sets by category: the k-th warm-up maps to last time's k-th warm-up,
  // the k-th working set to last time's k-th working set.
  const prevAligned = useMemo(() => {
    if (!prev?.length) return [] as (WorkoutSet | undefined)[];
    const warm = prev.filter((s) => s.type === 'warmup');
    const work = prev.filter((s) => s.type !== 'warmup');
    let w = 0;
    let k = 0;
    return we.sets.map((s) => (s.type === 'warmup' ? warm[w++] : (work[k++] ?? work[work.length - 1])));
  }, [prev, we.sets]);

  // Ghost = last logged set of the same type in this session, else the aligned previous set.
  const ghostFor = useCallback(
    (i: number): Ghost => {
      const p = prevAligned[i];
      const above = [...we.sets.slice(0, i)].reverse().find((s) => s.completed && s.type === we.sets[i]?.type);
      const src = above ?? p;
      return { weight: src?.weight ?? null, reps: src?.reps ?? null, durationSec: src?.durationSec ?? null };
    },
    [prevAligned, we.sets],
  );

  const onChange = useCallback((setId: string, patch: Partial<WorkoutSet>) => actions.updateSet(target, we.id, setId, patch), [actions, target, we.id]);
  const onType = useCallback((setId: string, t: SetType) => actions.setSetType(target, we.id, setId, t), [actions, target, we.id]);
  const onCopyPrev = useCallback(
    (setId: string, p: WorkoutSet) => {
      actions.updateSet(target, we.id, setId, { weight: p.weight, reps: p.reps, durationSec: p.durationSec });
      haptic(6);
    },
    [actions, target, we.id],
  );
  const onDelete = useCallback(
    (setId: string) => {
      const removed = actions.removeSet(target, we.id, setId);
      if (!removed) return;
      haptic(10);
      toast({ message: 'Set removed', action: { label: 'Undo', run: () => useApp.getState().insertSet(target, we.id, removed.set, removed.index) } });
    },
    [actions, target, we.id],
  );

  const onToggle = useCallback(
    (setId: string) => {
      const st = useApp.getState();
      const w = target === 'active' ? st.active : st.workouts.find((x) => x.id === target);
      const cur = w?.exercises.find((e) => e.id === we.id);
      const i = cur?.sets.findIndex((s) => s.id === setId) ?? -1;
      if (!w || !cur || i < 0) return;
      const s = cur.sets[i];
      if (s.completed) {
        st.updateSet(target, we.id, setId, { completed: false, completedAt: undefined });
        if (live) useTimer.getState().skip();
        return;
      }
      const g = ghostFor(i);
      const patch: Partial<WorkoutSet> = { completed: true, completedAt: Date.now() };
      if (exercise.tracking === 'duration') {
        patch.durationSec = s.durationSec ?? g.durationSec;
        if (!patch.durationSec) return focusField(setId, 'duration', 'Enter a duration first');
      } else {
        patch.reps = s.reps ?? g.reps;
        patch.weight = s.weight ?? g.weight ?? (exercise.tracking === 'bodyweight_reps' ? null : undefined);
        if (exercise.tracking === 'bodyweight_reps' && !patch.weight) patch.weight = null; // no added load
        if (exercise.tracking === 'weight_reps' && patch.weight == null) return focusField(setId, 'weight', 'Enter a weight first');
        if (!patch.reps) return focusField(setId, 'reps', 'Enter reps first');
      }
      st.updateSet(target, we.id, setId, patch);
      haptic(14);
      if (!live) return;
      tick();

      // Live PR detection against everything before this workout + earlier sets today.
      const after = useApp.getState().active!;
      const flags = flagWorkoutPRs(st.workouts, after, (id) => lookup(id)?.tracking);
      const kinds = flags.get(setId);
      if (kinds?.length) {
        haptic([20, 40, 20, 40, 60]);
        const done = after.exercises.find((e) => e.id === we.id)!.sets.find((x) => x.id === setId)!;
        useUI.getState().celebrate({
          exerciseName: exercise.name,
          kinds,
          detail: `${fmtWeight(done.weight, unit)}${done.weight ? ` ${unit} × ` : ''}${done.reps} reps`,
        });
      }

      // Superset: no rest between members — hop to the next exercise in the group.
      const exIdx = after.exercises.findIndex((e) => e.id === we.id);
      const nextInGroup = we.supersetId && after.exercises[exIdx + 1]?.supersetId === we.supersetId ? after.exercises[exIdx + 1] : null;
      const nextSet = after.exercises[exIdx].sets.find((x) => !x.completed);
      if (nextInGroup) {
        const target = nextInGroup.sets.find((x) => !x.completed);
        if (target) prepare(target.id, isDesktop);
        return;
      }
      const remaining = after.exercises.some((e) => e.sets.some((x) => !x.completed));
      const sec = s.type === 'warmup' ? Math.min(restSec, 60) : restSec;
      if (sec > 0 && remaining) useTimer.getState().start(sec, exercise.name);
      // Next round of a superset starts back at the group's first exercise.
      const groupStart = firstInGroup(after, exIdx);
      const focusSet =
        (groupStart !== exIdx ? after.exercises[groupStart].sets.find((x) => !x.completed) : undefined) ??
        nextSet ??
        after.exercises.slice(exIdx + 1).flatMap((e) => e.sets).find((x) => !x.completed);
      if (focusSet) prepare(focusSet.id, isDesktop);
    },
    [target, we.id, we.supersetId, ghostFor, exercise, live, lookup, unit, restSec, isDesktop],
  );

  const removeExercise = () => {
    const r = actions.removeExercise(target, we.id);
    if (!r) return;
    toast({ message: `${exercise.name} removed`, action: { label: 'Undo', run: () => useApp.getState().insertExercise(target, r.we, r.index) } });
  };

  let working = 0;
  const muscles = [exercise.primaryMuscle, ...exercise.secondaryMuscles].slice(0, 3).map((m) => MUSCLE_LABEL[m]);
  const allDone = done === we.sets.length && we.sets.length > 0;

  return (
    <motion.section
      layout="position"
      className={cx('ex-block', linkedPrev && 'ss-prev', linkedNext && 'ss-next', allDone && 'ex-done')}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0, transition: { duration: 0.2 } }}
      aria-label={exercise.name}
    >
      {(linkedPrev || linkedNext) && <span className="ss-rail" aria-hidden="true" />}
      <header className="ex-head">
        <div className="ex-index num" aria-hidden="true">
          {allDone ? <Icon name="check" size={15} strokeWidth={3} /> : String(index + 1).padStart(2, '0')}
        </div>
        <div className="ex-title">
          <Link to={`/exercises/${exercise.id}`} className="ex-name">
            {exercise.name}
          </Link>
          <div className="ex-sub">
            {linkedNext || linkedPrev ? <span className="ss-tag">Superset</span> : null}
            <span>{muscles.join(' · ')}</span>
          </div>
        </div>
        <div className="ex-actions">
          <Menu
            label="Rest timer"
            width={232}
            trigger={(p) => (
              <button type="button" className={cx('rest-chip num', we.restSec != null && 'custom')} aria-label={`Rest ${fmtClock(restSec)}. Change`} {...p}>
                <Icon name="timer" size={14} />
                {restSec ? fmtClock(restSec) : 'Off'}
              </button>
            )}
          >
            {(close) => (
              <>
                <MenuLabel>Rest after each set</MenuLabel>
                <div className="rest-grid">
                  {REST_OPTIONS.map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      className={cx('rest-opt num', sec === restSec && 'on')}
                      onClick={() => {
                        actions.setExerciseField(target, we.id, { restSec: sec });
                        close();
                      }}
                    >
                      {sec ? fmtClock(sec) : 'Off'}
                    </button>
                  ))}
                </div>
                {we.restSec != null && (
                  <MenuItem
                    icon="history"
                    onSelect={() => {
                      actions.setExerciseField(target, we.id, { restSec: undefined });
                      close();
                    }}
                  >
                    Use default ({fmtClock(exercise.defaultRestSec ?? defaultRest)})
                  </MenuItem>
                )}
              </>
            )}
          </Menu>
          <Menu
            label="Exercise options"
            trigger={(p) => (
              <button type="button" className="icon-btn" aria-label="Exercise options" {...p}>
                <Icon name="more" />
              </button>
            )}
          >
            {(close) => (
              <>
                <MenuItem icon="note" onSelect={() => (setShowNotes(true), close(), requestAnimationFrame(() => document.getElementById(`note-${we.id}`)?.focus()))}>
                  {we.notes ? 'Edit note' : 'Add note'}
                </MenuItem>
                {!isLast && (
                  <MenuItem icon="link" onSelect={() => (actions.toggleSuperset(target, we.id), close())}>
                    {linkedNext ? 'Unlink superset' : 'Superset with next'}
                  </MenuItem>
                )}
                <MenuItem icon="swap" onSelect={() => (setReplace(true), close())}>
                  Replace exercise
                </MenuItem>
                <MenuItem icon="grip" onSelect={() => (onReorder(), close())}>
                  Reorder exercises
                </MenuItem>
                <MenuSep />
                <MenuItem icon="trash" tone="danger" onSelect={() => (close(), removeExercise())}>
                  Remove exercise
                </MenuItem>
              </>
            )}
          </Menu>
        </div>
      </header>

      <div className="ex-meta">
        <span>
          <span className="faint">Last</span>{' '}
          <strong className="num">{prev?.length ? summarizePrev(prev, exercise, unit) : 'First time'}</strong>
        </span>
        {bestE1 > 0 && (
          <span>
            <span className="faint">Best e1RM</span>{' '}
            <strong className="num">
              {fmtWeight(bestE1, unit)} {unit}
            </strong>
          </span>
        )}
        {exercise.tracking !== 'duration' && (exercise.tracking === 'weight_reps' || volume > 0) && (
          <span>
            <span className="faint">Volume</span>{' '}
            <strong className="num">
              {fmtVolume(volume, unit)} {unit}
            </strong>
          </span>
        )}
        {prCount > 0 && (
          <span className="ex-pr">
            <Icon name="trophy" size={13} strokeWidth={2.2} /> {prCount} PR
          </span>
        )}
      </div>

      <AnimatePresence initial={false}>
        {showNotes && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <textarea
              id={`note-${we.id}`}
              className="ex-note"
              placeholder="Seat height, grip, cues…"
              value={we.notes}
              rows={1}
              onChange={(e) => actions.setExerciseField(target, we.id, { notes: e.target.value })}
              onBlur={(e) => !e.target.value && setShowNotes(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className={cx('set-table', exercise.tracking === 'duration' && 'is-duration')} role="table" aria-label={`${exercise.name} sets`}>
        <div className="set-head" role="row">
          <span>Set</span>
          <span>Previous</span>
          {exercise.tracking === 'duration' ? (
            <span>Time</span>
          ) : (
            <>
              <span>{exercise.tracking === 'bodyweight_reps' ? `+${unit}` : unit}</span>
              <span>Reps</span>
            </>
          )}
          <span className="sr-only">Done</span>
        </div>
        <AnimatePresence initial={false}>
          {we.sets.map((s, i) => {
            if (s.type !== 'warmup') working++;
            return (
              <motion.div key={s.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }}>
                <SetRow
                  set={s}
                  index={s.type === 'warmup' ? 0 : working}
                  exercise={exercise}
                  unit={unit}
                  prev={prevAligned[i]}
                  ghost={ghostFor(i)}
                  upNext={live && s.id === upNextId}
                  prKinds={prFlags.get(s.id)}
                  onChange={onChange}
                  onToggle={onToggle}
                  onType={onType}
                  onDelete={onDelete}
                  onCopyPrev={onCopyPrev}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <button type="button" className="add-set" onClick={() => (actions.addSet(target, we.id), haptic(6))}>
        <Icon name="plus" size={16} strokeWidth={2.2} /> Add set
      </button>

      <ExercisePicker
        open={replace}
        single
        title="Replace exercise"
        onClose={() => setReplace(false)}
        onPick={([id]) => {
          actions.replaceExercise(target, we.id, id);
          setReplace(false);
        }}
      />
    </motion.section>
  );
});

function firstInGroup(w: Workout, i: number): number {
  const gid = w.exercises[i].supersetId;
  if (!gid) return i;
  let j = i;
  while (j > 0 && w.exercises[j - 1].supersetId === gid) j--;
  return j;
}
function focusField(setId: string, field: string, msg: string) {
  const el = document.querySelector<HTMLInputElement>(`[data-set="${setId}"][data-field="${field}"]`);
  el?.focus();
  toast({ message: msg });
}

/** Bring the next set into view; on desktop also move keyboard focus to it. */
function prepare(setId: string, focus: boolean) {
  requestAnimationFrame(() => {
    const el = document.querySelector<HTMLInputElement>(`[data-set="${setId}"]`);
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.bottom > window.innerHeight - 200 || r.top < 80) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (focus) el.focus({ preventScroll: true });
  });
}

function summarizePrev(prev: WorkoutSet[], ex: Exercise, unit: string): string {
  const work = prev.filter((s) => s.type !== 'warmup');
  const list = work.length ? work : prev;
  if (ex.tracking === 'duration') return list.map((s) => fmtClock(s.durationSec ?? 0)).join(', ');
  const top = list.reduce((a, b) => ((b.weight ?? 0) > (a.weight ?? 0) ? b : a), list[0]);
  if (ex.tracking === 'bodyweight_reps' && !top.weight) return `${list.length} × ${list.map((s) => s.reps).join('/')}`;
  return `${list.length} × ${fmtWeight(top.weight, unit as 'kg')} ${unit} × ${top.reps}`;
}

function fallbackExercise(id: string): Exercise {
  return { id, name: 'Unknown exercise', primaryMuscle: 'chest', secondaryMuscles: [], equipment: 'other', category: 'isolation', tracking: 'weight_reps', instructions: [], isCustom: true };
}

