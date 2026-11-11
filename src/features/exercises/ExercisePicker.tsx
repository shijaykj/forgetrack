import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MUSCLE_GROUPS, type MuscleGroup } from '@/domain/types';
import { useApp } from '@/store/app';
import { useAllExercises, useIsDesktop } from '@/lib/hooks';
import { exerciseFrequency } from '@/domain/analytics';
import { EQUIPMENT_LABEL, MUSCLE_LABEL } from '@/data/exercises';
import { Icon } from '@/components/Icon';
import { Button, Chip, Sheet } from '@/components/ui';
import { cx } from '@/lib/util';
import { CustomExerciseForm } from './CustomExerciseForm';

export function ExercisePicker({
  open,
  onClose,
  onPick,
  single,
  title = 'Add exercises',
}: {
  open: boolean;
  onClose: () => void;
  onPick: (ids: string[]) => void;
  single?: boolean;
  title?: string;
}) {
  const all = useAllExercises();
  const workouts = useApp((s) => s.workouts);
  const isDesktop = useIsDesktop();
  const [q, setQ] = useState('');
  const dq = useDeferredValue(q);
  const [muscle, setMuscle] = useState<MuscleGroup | 'custom' | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ('');
      setSelected([]);
      setMuscle(null);
      setCreating(false);
    }
  }, [open]);

  const freq = useMemo(() => exerciseFrequency(workouts), [workouts]);
  const freqMap = useMemo(() => new Map(freq.map((f) => [f.exerciseId, f])), [freq]);

  const results = useMemo(() => {
    const terms = dq.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return all.filter((e) => {
      if (muscle === 'custom' && !e.isCustom) return false;
      if (muscle && muscle !== 'custom' && e.primaryMuscle !== muscle && !e.secondaryMuscles.includes(muscle)) return false;
      if (!terms.length) return true;
      const hay = `${e.name} ${MUSCLE_LABEL[e.primaryMuscle]} ${EQUIPMENT_LABEL[e.equipment]}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }, [all, dq, muscle]);

  const recent = useMemo(() => {
    if (dq || muscle) return [];
    const ids = new Set(results.map((r) => r.id));
    return freq.filter((f) => ids.has(f.exerciseId)).slice(0, 6).map((f) => all.find((e) => e.id === f.exerciseId)!).filter(Boolean);
  }, [freq, results, dq, muscle, all]);

  const toggle = (id: string) => {
    if (single) return onPick([id]);
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const row = (e: (typeof all)[number]) => {
    const on = selected.includes(e.id);
    const f = freqMap.get(e.id);
    const order = selected.indexOf(e.id) + 1;
    return (
      <li key={e.id}>
        <button type="button" className={cx('pick-row', on && 'on')} onClick={() => toggle(e.id)} aria-pressed={on}>
          <span className={cx('pick-mark', `m-${e.primaryMuscle}`)} aria-hidden="true">
            {MUSCLE_LABEL[e.primaryMuscle].slice(0, 2)}
          </span>
          <span className="pick-text">
            <span className="pick-name truncate">
              {e.name}
              {e.isCustom && <span className="pick-custom">Custom</span>}
            </span>
            <span className="pick-sub faint truncate">
              {MUSCLE_LABEL[e.primaryMuscle]} · {EQUIPMENT_LABEL[e.equipment]}
              {f ? ` · ${f.sessions}× logged` : ''}
            </span>
          </span>
          {!single && (
            <span className={cx('pick-check', on && 'on')}>{on ? <span className="num">{order}</span> : <Icon name="plus" size={16} />}</span>
          )}
        </button>
      </li>
    );
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      size="full"
      title={creating ? 'Custom exercise' : title}
      className="picker"
      footer={
        !creating && !single && selected.length > 0 ? (
          <Button variant="primary" size="lg" block icon="plus" onClick={() => onPick(selected)}>
            Add {selected.length} exercise{selected.length > 1 ? 's' : ''}
          </Button>
        ) : undefined
      }
    >
      {creating ? (
        <CustomExerciseForm
          initialName={q}
          onCancel={() => setCreating(false)}
          onSaved={(id) => {
            setCreating(false);
            if (single) onPick([id]);
            else setSelected((s) => [...s, id]);
          }}
        />
      ) : (
        <>
          <div className="pick-search">
            <Icon name="search" size={18} />
            <input
              ref={searchRef}
              type="search"
              placeholder="Search 70+ exercises"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              {...(isDesktop ? { 'data-autofocus': true } : {})}
              aria-label="Search exercises"
            />
            {q && (
              <button type="button" className="icon-btn" aria-label="Clear search" onClick={() => (setQ(''), searchRef.current?.focus())}>
                <Icon name="x" size={16} />
              </button>
            )}
          </div>
          <div className="pick-filters" role="group" aria-label="Filter by muscle">
            <Chip active={muscle === null} onClick={() => setMuscle(null)}>
              All
            </Chip>
            {MUSCLE_GROUPS.map((m) => (
              <Chip key={m} active={muscle === m} onClick={() => setMuscle(muscle === m ? null : m)}>
                {MUSCLE_LABEL[m]}
              </Chip>
            ))}
            <Chip active={muscle === 'custom'} onClick={() => setMuscle(muscle === 'custom' ? null : 'custom')}>
              Custom
            </Chip>
          </div>

          {recent.length > 0 && (
            <>
              <div className="eyebrow pick-group">Most logged</div>
              <ul className="pick-list">{recent.map(row)}</ul>
            </>
          )}
          <div className="eyebrow pick-group">{dq || muscle ? `${results.length} results` : 'All exercises'}</div>
          <ul className="pick-list">
            <AnimatePresence initial={false}>{results.map(row)}</AnimatePresence>
          </ul>
          {results.length === 0 && (
            <motion.div className="pick-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p className="muted">No match for “{q}”.</p>
            </motion.div>
          )}
          <button type="button" className="pick-create" onClick={() => setCreating(true)}>
            <Icon name="plus" size={18} />
            <span>
              Create custom exercise{q ? ` “${q}”` : ''}
              <span className="faint">Any movement, any equipment</span>
            </span>
          </button>
        </>
      )}
    </Sheet>
  );
}
