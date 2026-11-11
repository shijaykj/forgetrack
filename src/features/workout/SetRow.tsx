import { memo, useEffect, useRef, useState } from 'react';
import { motion, useAnimationControls, useMotionValue, useTransform } from 'framer-motion';
import type { Exercise, PRKind, SetType, Unit, WorkoutSet } from '@/domain/types';
import { Icon } from '@/components/Icon';
import { Menu, MenuItem, MenuLabel, MenuSep } from '@/components/Menu';
import { cx, fmtDurationInput, fmtWeight, fromDisplay, toDisplay, weightStep } from '@/lib/util';
import { PR_SHORT } from '@/domain/calc';

export interface Ghost {
  weight: number | null;
  reps: number | null;
  durationSec: number | null;
}

const TYPE_META: Record<SetType, { short: string; label: string; cls: string }> = {
  warmup: { short: 'W', label: 'Warm-up', cls: 'st-warmup' },
  normal: { short: '', label: 'Working set', cls: '' },
  failure: { short: 'F', label: 'To failure', cls: 'st-failure' },
  drop: { short: 'D', label: 'Drop set', cls: 'st-drop' },
};

function parseDuration(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  if (t.includes(':')) {
    const [m, s] = t.split(':');
    const n = (parseInt(m, 10) || 0) * 60 + (parseInt(s, 10) || 0);
    return n > 0 ? n : null;
  }
  const n = parseFloat(t);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

/** Numeric cell with local draft state so partial input ("82.") isn't clobbered. */
function NumCell({
  value,
  placeholder,
  onCommit,
  kind,
  setId,
  onEnter,
  label,
  unit,
  disabled,
}: {
  value: number | null | undefined;
  placeholder: string;
  onCommit: (n: number | null) => void;
  kind: 'weight' | 'reps' | 'duration';
  setId: string;
  onEnter: () => void;
  label: string;
  unit: Unit;
  disabled?: boolean;
}) {
  const fmt = (v: number | null | undefined) =>
    v == null ? '' : kind === 'weight' ? fmtWeight(v, unit) : kind === 'duration' ? fmtDurationInput(v) : String(v);
  const [draft, setDraft] = useState(fmt(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setDraft(fmt(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, unit]);

  const parse = (s: string): number | null => {
    if (kind === 'duration') return parseDuration(s);
    const n = parseFloat(s.replace(',', '.'));
    if (!Number.isFinite(n) || n < 0) return null;
    if (kind === 'reps') return Math.min(999, Math.round(n));
    return fromDisplay(Math.min(n, 2000), unit);
  };
  const commit = (s: string) => onCommit(parse(s));

  const step = (dir: 1 | -1) => {
    const base = parse(draft) ?? (placeholder ? parse(placeholder) : null) ?? 0;
    let next: number;
    if (kind === 'weight') next = fromDisplay(Math.max(0, toDisplay(base, unit) + dir * weightStep(unit)), unit);
    else if (kind === 'duration') next = Math.max(0, base + dir * 5);
    else next = Math.max(0, base + dir);
    setDraft(fmt(next));
    onCommit(next);
  };

  return (
    <input
      className={cx('cell-input num', kind === 'duration' && 'cell-wide')}
      data-set={setId}
      data-field={kind}
      aria-label={label}
      inputMode={kind === 'reps' ? 'numeric' : kind === 'duration' ? 'text' : 'decimal'}
      enterKeyHint="done"
      autoComplete="off"
      value={draft}
      placeholder={placeholder}
      disabled={disabled}
      onFocus={(e) => {
        focused.current = true;
        e.currentTarget.select();
      }}
      onBlur={(e) => {
        focused.current = false;
        commit(e.currentTarget.value);
        setDraft(fmt(parse(e.currentTarget.value)));
      }}
      onChange={(e) => {
        const v = kind === 'duration' ? e.target.value.replace(/[^\d:]/g, '') : e.target.value.replace(/[^\d.,]/g, '');
        setDraft(v);
        commit(v);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commit(e.currentTarget.value);
          onEnter();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          step(1);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          step(-1);
        }
      }}
    />
  );
}

export interface SetRowProps {
  set: WorkoutSet;
  index: number; // index among working sets for numbering
  exercise: Exercise;
  unit: Unit;
  prev?: WorkoutSet;
  ghost: Ghost;
  upNext: boolean;
  prKinds?: PRKind[];
  onChange: (setId: string, patch: Partial<WorkoutSet>) => void;
  onToggle: (setId: string) => void;
  onType: (setId: string, t: SetType) => void;
  onDelete: (setId: string) => void;
  onCopyPrev: (setId: string, prev: WorkoutSet) => void;
}

export const SetRow = memo(function SetRow({
  set,
  index,
  exercise,
  unit,
  prev,
  ghost,
  upNext,
  prKinds,
  onChange,
  onToggle,
  onType,
  onDelete,
  onCopyPrev,
}: SetRowProps) {
  const meta = TYPE_META[set.type];
  const name = index ? `set ${index}` : 'warm-up set';
  const tracking = exercise.tracking;
  const x = useMotionValue(0);
  const trashOpacity = useTransform(x, [-90, -30, 0], [1, 0.4, 0]);
  const controls = useAnimationControls();

  const prevText = prev
    ? tracking === 'duration'
      ? fmtDurationInput(prev.durationSec) + (prev.durationSec && prev.durationSec < 60 ? 's' : '')
      : tracking === 'bodyweight_reps'
        ? `${prev.weight ? `+${fmtWeight(prev.weight, unit)} × ` : ''}${prev.reps ?? '–'}`
        : `${fmtWeight(prev.weight, unit) || '–'} × ${prev.reps ?? '–'}`
    : '—';

  return (
    <div className="set-swipe">
      <motion.div className="set-swipe-bg" style={{ opacity: trashOpacity }} aria-hidden="true">
        <Icon name="trash" size={18} />
      </motion.div>
      <motion.div
        className={cx('set-row', set.completed && 'is-done', upNext && !set.completed && 'is-next', meta.cls)}
        style={{ x }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -120, right: 0 }}
        dragElastic={{ left: 0.25, right: 0 }}
        dragSnapToOrigin
        animate={controls}
        onDragEnd={(_, info) => {
          if (info.offset.x < -80) onDelete(set.id);
        }}
        layout="position"
      >
        <Menu
          label="Set options"
          width={220}
          align="start"
          trigger={(p) => (
            <button type="button" className={cx('set-idx', meta.cls)} aria-label={`${name}, ${meta.label}. Change type`} {...p}>
              {meta.short || index}
            </button>
          )}
        >
          {(close) => (
            <>
              <MenuLabel>Set type</MenuLabel>
              {(Object.keys(TYPE_META) as SetType[]).map((t) => (
                <MenuItem
                  key={t}
                  active={set.type === t}
                  hint={<span className={cx('type-dot', TYPE_META[t].cls)}>{TYPE_META[t].short || 'N'}</span>}
                  onSelect={() => {
                    onType(set.id, t);
                    close();
                  }}
                >
                  {TYPE_META[t].label}
                </MenuItem>
              ))}
              <MenuSep />
              <MenuItem
                icon="trash"
                tone="danger"
                onSelect={() => {
                  close();
                  onDelete(set.id);
                }}
              >
                Remove set
              </MenuItem>
            </>
          )}
        </Menu>

        <button
          type="button"
          className="set-prev num"
          disabled={!prev || set.completed}
          onClick={() => prev && onCopyPrev(set.id, prev)}
          aria-label={prev ? `Previous: ${prevText}. Tap to copy` : 'No previous data'}
          title={prev ? 'Copy previous' : undefined}
        >
          {prevText}
        </button>

        {tracking === 'duration' ? (
          <NumCell
            kind="duration"
            setId={set.id}
            unit={unit}
            label={`${name} duration`}
            value={set.durationSec}
            placeholder={ghost.durationSec != null ? fmtDurationInput(ghost.durationSec) : '0:00'}
            onCommit={(n) => onChange(set.id, { durationSec: n })}
            onEnter={() => onToggle(set.id)}
          />
        ) : (
          <>
            <NumCell
              kind="weight"
              setId={set.id}
              unit={unit}
              label={`${name} ${tracking === 'bodyweight_reps' ? 'added weight' : 'weight'}`}
              value={set.weight}
              placeholder={ghost.weight != null && (ghost.weight > 0 || tracking !== 'bodyweight_reps') ? fmtWeight(ghost.weight, unit) : tracking === 'bodyweight_reps' ? '–' : '0'}
              onCommit={(n) => onChange(set.id, { weight: n })}
              onEnter={() => document.querySelector<HTMLInputElement>(`[data-set="${set.id}"][data-field="reps"]`)?.focus()}
            />
            <NumCell
              kind="reps"
              setId={set.id}
              unit={unit}
              label={`${name} reps`}
              value={set.reps}
              placeholder={ghost.reps != null ? String(ghost.reps) : '0'}
              onCommit={(n) => onChange(set.id, { reps: n })}
              onEnter={() => onToggle(set.id)}
            />
          </>
        )}

        <button
          type="button"
          className={cx('set-check', set.completed && 'on')}
          aria-pressed={set.completed}
          aria-label={set.completed ? `${name} done. Tap to undo` : `Complete ${name}`}
          onClick={() => onToggle(set.id)}
        >
          <motion.span
            key={String(set.completed)}
            initial={set.completed ? { scale: 0.4, rotate: -20 } : false}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 700, damping: 22 }}
            style={{ display: 'grid' }}
          >
            <Icon name="check" size={22} strokeWidth={set.completed ? 3 : 2.25} />
          </motion.span>
        </button>

        {prKinds && prKinds.length > 0 && (
          <motion.span className="set-pr" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} title={prKinds.map((k) => PR_SHORT[k]).join(', ')}>
            <Icon name="trophy" size={11} strokeWidth={2.4} />
            PR
          </motion.span>
        )}
      </motion.div>
    </div>
  );
});
