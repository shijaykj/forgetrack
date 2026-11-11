import { useMemo } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApp } from '@/store/app';
import { useDocumentTitle, useExerciseLookup } from '@/lib/hooks';
import { sortNewest } from '@/domain/calc';
import { Icon } from '@/components/Icon';
import { Button, EmptyState } from '@/components/ui';
import { MUSCLE_LABEL } from '@/data/exercises';
import { relativeDay } from '@/lib/util';
import type { MuscleGroup } from '@/domain/types';
import '@/styles/workout.css';

export default function StartWorkout() {
  useDocumentTitle('Start workout');
  const active = useApp((s) => s.active);
  const routines = useApp((s) => s.routines);
  const workouts = useApp((s) => s.workouts);
  const startWorkout = useApp((s) => s.startWorkout);
  const lookup = useExerciseLookup();
  const navigate = useNavigate();
  const sorted = useMemo(() => routines.slice().sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0) || a.name.localeCompare(b.name)), [routines]);
  const recent = useMemo(() => sortNewest(workouts).filter((w) => !w.routineId).slice(0, 3), [workouts]);

  if (active) return <Navigate to="/workout" replace />;

  const go = (opts?: Parameters<typeof startWorkout>[0]) => {
    startWorkout(opts);
    navigate('/workout', { replace: true });
  };

  return (
    <div className="page page-narrow">
      <div className="page-head">
        <div>
          <div className="eyebrow">New session</div>
          <h1>Start workout</h1>
        </div>
      </div>

      <motion.button type="button" className="start-empty" onClick={() => go()} whileTap={{ scale: 0.985 }} autoFocus>
        <span className="start-empty-icon">
          <Icon name="bolt" size={26} strokeWidth={2.2} />
        </span>
        <span className="start-empty-text">
          <strong>Empty workout</strong>
          <span className="faint">Add exercises as you go</span>
        </span>
        <Icon name="arrowRight" size={20} />
      </motion.button>

      <div className="row-between" style={{ margin: '28px 0 12px' }}>
        <h2 style={{ fontSize: 17 }}>From a routine</h2>
        <Link to="/routines" className="link-sm">
          Manage
        </Link>
      </div>
      {sorted.length === 0 ? (
        <div className="card">
          <EmptyState icon="layers" title="No routines yet" body="Routines are templates — exercises, sets and targets — you can start in one tap." action={<Button icon="plus" onClick={() => navigate('/routines')}>Create routine</Button>} />
        </div>
      ) : (
        <div className="start-grid">
          {sorted.map((r, i) => {
            const muscles = [...new Set(r.exercises.map((e) => lookup(e.exerciseId)?.primaryMuscle).filter(Boolean))] as MuscleGroup[];
            return (
              <motion.button
                type="button"
                key={r.id}
                className="start-card card card-interactive"
                onClick={() => go({ routineId: r.id })}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <div className="row-between">
                  <strong className="start-card-name truncate">{r.name}</strong>
                  <span className="quick-go">
                    <Icon name="play" size={14} strokeWidth={2.4} />
                  </span>
                </div>
                <div className="faint start-card-meta">
                  {r.exercises.length} exercises · {r.lastUsedAt ? relativeDay(r.lastUsedAt) : 'never started'}
                </div>
                <ol className="start-card-list">
                  {r.exercises.slice(0, 4).map((e) => (
                    <li key={e.id} className="truncate">
                      <span className="num faint">{e.sets.length}×</span> {lookup(e.exerciseId)?.name ?? 'Exercise'}
                    </li>
                  ))}
                  {r.exercises.length > 4 && <li className="faint">+{r.exercises.length - 4} more</li>}
                </ol>
                <div className="start-card-tags">
                  {muscles.slice(0, 4).map((m) => (
                    <span key={m} className="badge">
                      {MUSCLE_LABEL[m]}
                    </span>
                  ))}
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      {recent.length > 0 && (
        <>
          <h2 style={{ fontSize: 17, margin: '28px 0 12px' }}>Repeat a recent session</h2>
          <div className="stack" style={{ gap: 8 }}>
            {recent.map((w) => (
              <button key={w.id} type="button" className="repeat-row" onClick={() => go({ fromWorkoutId: w.id })}>
                <Icon name="history" size={18} />
                <span className="truncate" style={{ flex: 1 }}>
                  <strong>{w.name}</strong>
                  <span className="faint"> · {relativeDay(w.startedAt)}</span>
                </span>
                <span className="faint num">{w.exercises.length} ex</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
