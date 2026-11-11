import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import { applyLinks, linksOf, useApp } from '@/store/app';
import { toast } from '@/store/ui';
import { useDocumentTitle, useExerciseLookup } from '@/lib/hooks';
import { Icon } from '@/components/Icon';
import { Button, IconButton, TextArea } from '@/components/ui';
import { Menu, MenuItem, MenuLabel, MenuSep } from '@/components/Menu';
import { ExercisePicker } from '../exercises/ExercisePicker';
import { MUSCLE_LABEL } from '@/data/exercises';
import { cx, fmtClock, fmtWeight, fromDisplay, uid } from '@/lib/util';
import { fmtDurationInput } from '@/lib/util';
import type { Routine, RoutineExercise, SetType, TemplateSet } from '@/domain/types';
import '@/styles/pages.css';
import '@/styles/workout.css';

const TYPE_SHORT: Record<SetType, string> = { warmup: 'W', normal: '', failure: 'F', drop: 'D' };
const REST = [0, 30, 45, 60, 90, 120, 150, 180, 240, 300];

export default function RoutineBuilder() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const routine = useApp((s) => s.routines.find((r) => r.id === id));
  const save = useApp((s) => s.saveRoutine);
  const navigate = useNavigate();
  const [picker, setPicker] = useState(false);
  const [replaceFor, setReplaceFor] = useState<string | null>(null);
  useDocumentTitle(routine?.name ?? 'Routine');
  const nameRef = useRef<HTMLInputElement>(null);

  // Brand-new routine: focus the name and open the picker straight away.
  useEffect(() => {
    if (params.get('new')) {
      nameRef.current?.select();
      setPicker(true);
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  if (!routine) return <Navigate to="/routines" replace />;

  const update = (fn: (r: Routine) => Routine) => save(fn(useApp.getState().routines.find((r) => r.id === id)!));
  const updateEx = (exId: string, fn: (e: RoutineExercise) => RoutineExercise) =>
    update((r) => ({ ...r, exercises: r.exercises.map((e) => (e.id === exId ? fn(e) : e)) }));

  const startNow = () => {
    const st = useApp.getState();
    if (st.active) return toast({ message: 'A workout is already in progress', action: { label: 'Open', run: () => navigate('/workout') } });
    st.startWorkout({ routineId: routine.id });
    navigate('/workout');
  };

  return (
    <div className="page page-narrow builder">
      <Link to="/routines" className="back-link">
        <Icon name="chevronLeft" size={18} /> Routines
      </Link>
      <div className="builder-head">
        <input
          ref={nameRef}
          className="builder-name"
          value={routine.name}
          onChange={(e) => update((r) => ({ ...r, name: e.target.value.slice(0, 60) }))}
          onBlur={(e) => !e.target.value.trim() && update((r) => ({ ...r, name: 'Untitled routine' }))}
          aria-label="Routine name"
          placeholder="Routine name"
        />
        <div className="row">
          <span className="saved-pill faint">
            <Icon name="check" size={13} strokeWidth={2.4} /> Saved
          </span>
          <Button variant="primary" icon="play" onClick={startNow} disabled={routine.exercises.length === 0}>
            Start
          </Button>
        </div>
      </div>
      <TextArea placeholder="Notes — goal, tempo, progression scheme…" value={routine.notes} onChange={(e) => update((r) => ({ ...r, notes: e.target.value }))} rows={2} className="builder-notes" />

      {routine.exercises.length === 0 ? (
        <div className="wo-empty" style={{ marginTop: 18 }}>
          <div className="wo-empty-mark">
            <Icon name="layers" size={30} />
          </div>
          <h3>Add exercises</h3>
          <p className="muted">Pick everything for this routine at once — you can reorder by dragging.</p>
          <Button variant="primary" size="lg" icon="plus" onClick={() => setPicker(true)}>
            Add exercises
          </Button>
        </div>
      ) : (
        <Reorder.Group
          axis="y"
          values={routine.exercises}
          onReorder={(list) => update((r) => ({ ...r, exercises: applyLinks(list, linksOf(list)) }))}
          className="builder-list"
        >
          {routine.exercises.map((e, i) => (
            <BuilderExercise
              key={e.id}
              re={e}
              index={i}
              linkedPrev={!!e.supersetId && routine.exercises[i - 1]?.supersetId === e.supersetId}
              linkedNext={!!e.supersetId && routine.exercises[i + 1]?.supersetId === e.supersetId}
              isLast={i === routine.exercises.length - 1}
              onChange={(fn) => updateEx(e.id, fn)}
              onRemove={() => {
                const index = routine.exercises.findIndex((x) => x.id === e.id);
                update((r) => ({ ...r, exercises: r.exercises.filter((x) => x.id !== e.id) }));
                toast({
                  message: 'Exercise removed',
                  action: {
                    label: 'Undo',
                    run: () =>
                      update((r) => {
                        const exercises = r.exercises.slice();
                        exercises.splice(index, 0, e);
                        return { ...r, exercises };
                      }),
                  },
                });
              }}
              onToggleSuperset={() =>
                update((r) => {
                  const links = linksOf(r.exercises);
                  links[i] = !links[i];
                  return { ...r, exercises: applyLinks(r.exercises, links) };
                })
              }
              onReplace={() => setReplaceFor(e.id)}
            />
          ))}
        </Reorder.Group>
      )}
      {routine.exercises.length > 0 && (
        <Button size="lg" icon="plus" block onClick={() => setPicker(true)} style={{ marginTop: 12 }}>
          Add exercises
        </Button>
      )}

      <ExercisePicker
        open={picker}
        onClose={() => setPicker(false)}
        onPick={(ids) => {
          update((r) => ({
            ...r,
            exercises: [
              ...r.exercises,
              ...ids.map<RoutineExercise>((exerciseId) => ({
                id: uid(),
                exerciseId,
                notes: '',
                supersetId: null,
                sets: Array.from({ length: 3 }, () => ({ id: uid(), type: 'normal' as const, reps: null, weight: null, durationSec: null })),
              })),
            ],
          }));
          setPicker(false);
        }}
      />
      <ExercisePicker
        open={!!replaceFor}
        single
        title="Replace exercise"
        onClose={() => setReplaceFor(null)}
        onPick={([exerciseId]) => {
          if (replaceFor) updateEx(replaceFor, (e) => ({ ...e, exerciseId }));
          setReplaceFor(null);
        }}
      />
    </div>
  );
}

function BuilderExercise({
  re,
  index,
  linkedPrev,
  linkedNext,
  isLast,
  onChange,
  onRemove,
  onToggleSuperset,
  onReplace,
}: {
  re: RoutineExercise;
  index: number;
  linkedPrev: boolean;
  linkedNext: boolean;
  isLast: boolean;
  onChange: (fn: (e: RoutineExercise) => RoutineExercise) => void;
  onRemove: () => void;
  onToggleSuperset: () => void;
  onReplace: () => void;
}) {
  const lookup = useExerciseLookup();
  const unit = useApp((s) => s.profile.unit);
  const defaultRest = useApp((s) => s.profile.defaultRestSec);
  const ex = lookup(re.exerciseId);
  const controls = useDragControls();
  const tracking = ex?.tracking ?? 'weight_reps';
  const rest = re.restSec ?? ex?.defaultRestSec ?? defaultRest;
  const setSets = (fn: (s: TemplateSet[]) => TemplateSet[]) => onChange((e) => ({ ...e, sets: fn(e.sets) }));
  let n = 0;

  return (
    <Reorder.Item value={re} dragListener={false} dragControls={controls} className={cx('ex-block builder-ex', linkedPrev && 'ss-prev', linkedNext && 'ss-next')} whileDrag={{ scale: 1.015, boxShadow: 'var(--shadow-lg)', zIndex: 5 }}>
      {(linkedPrev || linkedNext) && <span className="ss-rail" aria-hidden="true" />}
      <header className="ex-head">
        <span className="reorder-grip" onPointerDown={(e) => controls.start(e)} style={{ touchAction: 'none' }} aria-label="Drag to reorder" role="button" tabIndex={-1}>
          <Icon name="grip" size={20} />
        </span>
        <div className="ex-title">
          <div className="ex-name">{ex?.name ?? 'Unknown exercise'}</div>
          <div className="ex-sub">
            {(linkedPrev || linkedNext) && <span className="ss-tag">Superset</span>}
            <span>{ex ? MUSCLE_LABEL[ex.primaryMuscle] : ''}</span>
            <span className="num">#{index + 1}</span>
          </div>
        </div>
        <div className="ex-actions">
          <Menu
            label="Rest timer"
            width={232}
            trigger={(p) => (
              <button type="button" className={cx('rest-chip num', re.restSec != null && 'custom')} {...p} aria-label="Rest time">
                <Icon name="timer" size={14} />
                {rest ? fmtClock(rest) : 'Off'}
              </button>
            )}
          >
            {(close) => (
              <>
                <MenuLabel>Rest after each set</MenuLabel>
                <div className="rest-grid">
                  {REST.map((sec) => (
                    <button key={sec} type="button" className={cx('rest-opt num', sec === rest && 'on')} onClick={() => (onChange((e) => ({ ...e, restSec: sec })), close())}>
                      {sec ? fmtClock(sec) : 'Off'}
                    </button>
                  ))}
                </div>
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
                {!isLast && (
                  <MenuItem icon="link" onSelect={() => (close(), onToggleSuperset())}>
                    {linkedNext ? 'Unlink superset' : 'Superset with next'}
                  </MenuItem>
                )}
                <MenuItem icon="swap" onSelect={() => (close(), onReplace())}>
                  Replace exercise
                </MenuItem>
                <MenuSep />
                <MenuItem icon="trash" tone="danger" onSelect={() => (close(), onRemove())}>
                  Remove
                </MenuItem>
              </>
            )}
          </Menu>
        </div>
      </header>

      <div className={cx('tset-head', tracking === 'duration' && 'is-duration')}>
        <span />
        <span>Set</span>
        {tracking === 'duration' ? (
          <span>Target time</span>
        ) : (
          <>
            <span>Target {tracking === 'bodyweight_reps' ? `+${unit}` : unit}</span>
            <span>Reps</span>
          </>
        )}
        <span />
      </div>
      <Reorder.Group axis="y" values={re.sets} onReorder={(sets) => setSets(() => sets)} className="tset-list">
        <AnimatePresence initial={false}>
          {re.sets.map((s) => {
            if (s.type !== 'warmup') n++;
            return <TemplateRow key={s.id} s={s} n={n} tracking={tracking} unit={unit} onChange={(patch) => setSets((ss) => ss.map((x) => (x.id === s.id ? { ...x, ...patch } : x)))} onRemove={() => setSets((ss) => ss.filter((x) => x.id !== s.id))} />;
          })}
        </AnimatePresence>
      </Reorder.Group>
      <button
        type="button"
        className="add-set"
        onClick={() =>
          setSets((ss) => {
            const last = ss[ss.length - 1];
            return [...ss, { id: uid(), type: last?.type === 'warmup' ? 'normal' : (last?.type ?? 'normal'), weight: last?.weight ?? null, reps: last?.reps ?? null, durationSec: last?.durationSec ?? null }];
          })
        }
      >
        <Icon name="plus" size={16} strokeWidth={2.2} /> Add set
      </button>
    </Reorder.Item>
  );
}

function TemplateRow({
  s,
  n,
  tracking,
  unit,
  onChange,
  onRemove,
}: {
  s: TemplateSet;
  n: number;
  tracking: string;
  unit: 'kg' | 'lb';
  onChange: (p: Partial<TemplateSet>) => void;
  onRemove: () => void;
}) {
  const controls = useDragControls();
  const types: SetType[] = ['warmup', 'normal', 'failure', 'drop'];
  const cycle = () => onChange({ type: types[(types.indexOf(s.type) + 1) % types.length] });
  return (
    <Reorder.Item value={s} dragListener={false} dragControls={controls} className={cx('tset-row', tracking === 'duration' && 'is-duration')} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
      <span className="tset-grip" onPointerDown={(e) => controls.start(e)} style={{ touchAction: 'none' }} aria-hidden="true">
        <Icon name="grip" size={16} />
      </span>
      <button type="button" className={cx('set-idx', s.type !== 'normal' && `st-${s.type}`)} onClick={cycle} title="Tap to change set type" aria-label={`Set ${n}, type ${s.type}. Tap to change`}>
        {TYPE_SHORT[s.type] || n}
      </button>
      {tracking === 'duration' ? (
        <DraftInput value={fmtDurationInput(s.durationSec)} placeholder="1:00" onCommit={(v) => {
          const t = v.includes(':') ? (parseInt(v.split(':')[0]) || 0) * 60 + (parseInt(v.split(':')[1]) || 0) : parseInt(v) || 0;
          onChange({ durationSec: t || null });
        }} label="Target duration" mode="text" />
      ) : (
        <>
          <DraftInput value={s.weight != null ? fmtWeight(s.weight, unit) : ''} placeholder="—" onCommit={(v) => {
            const x = parseFloat(v.replace(',', '.'));
            onChange({ weight: Number.isFinite(x) && x >= 0 ? fromDisplay(x, unit) : null });
          }} label="Target weight" mode="decimal" />
          <DraftInput value={s.reps != null ? String(s.reps) : ''} placeholder="—" onCommit={(v) => {
            const x = parseInt(v, 10);
            onChange({ reps: Number.isFinite(x) && x > 0 ? x : null });
          }} label="Target reps" mode="numeric" />
        </>
      )}
      <IconButton icon="x" label="Remove set" size={16} onClick={onRemove} className="tset-del" />
    </Reorder.Item>
  );
}

function DraftInput({ value, placeholder, onCommit, label, mode }: { value: string; placeholder: string; onCommit: (v: string) => void; label: string; mode: 'decimal' | 'numeric' | 'text' }) {
  const [draft, setDraft] = useState(value);
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setDraft(value);
  }, [value]);
  return (
    <input
      className="cell-input num"
      inputMode={mode}
      aria-label={label}
      value={draft}
      placeholder={placeholder}
      onFocus={(e) => ((focused.current = true), e.currentTarget.select())}
      onBlur={() => ((focused.current = false), onCommit(draft))}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
    />
  );
}
