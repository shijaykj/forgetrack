import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApp } from '@/store/app';
import { toast } from '@/store/ui';
import { useDocumentTitle, useExerciseLookup } from '@/lib/hooks';
import { Icon } from '@/components/Icon';
import { Button, EmptyState } from '@/components/ui';
import { Menu, MenuItem, MenuSep } from '@/components/Menu';
import { MUSCLE_LABEL } from '@/data/exercises';
import { relativeDay } from '@/lib/util';
import type { MuscleGroup, Routine } from '@/domain/types';
import '@/styles/pages.css';

export default function Routines() {
  useDocumentTitle('Routines');
  const routines = useApp((s) => s.routines);
  const active = useApp((s) => s.active);
  const { createRoutine, duplicateRoutine, deleteRoutine, restoreRoutine, startWorkout } = useApp.getState();
  const navigate = useNavigate();
  const lookup = useExerciseLookup();
  const sorted = useMemo(() => routines.slice().sort((a, b) => (b.lastUsedAt ?? b.createdAt) - (a.lastUsedAt ?? a.createdAt)), [routines]);

  const create = () => navigate(`/routines/${createRoutine('New routine')}?new=1`);
  const start = (r: Routine) => {
    if (active) {
      toast({ message: 'Finish or discard the current workout first', action: { label: 'Open', run: () => navigate('/workout') } });
      return;
    }
    startWorkout({ routineId: r.id });
    navigate('/workout');
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Templates · unlimited</div>
          <h1>Routines</h1>
        </div>
        <div className="page-head-actions">
          <Link to="/exercises" className="btn btn-ghost btn-md">
            <Icon name="dumbbell" size={18} />
            <span>Library</span>
          </Link>
          <Button variant="primary" icon="plus" onClick={create}>
            New routine
          </Button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="layers"
            title="Build your first routine"
            body="A routine is a reusable plan: exercises, set counts, target weights and rest times. Start it in one tap from Today."
            action={
              <Button variant="primary" icon="plus" onClick={create}>
                Create routine
              </Button>
            }
          />
        </div>
      ) : (
        <div className="routine-grid">
          {sorted.map((r, i) => {
            const muscles = [...new Set(r.exercises.map((e) => lookup(e.exerciseId)?.primaryMuscle).filter(Boolean))] as MuscleGroup[];
            const sets = r.exercises.reduce((n, e) => n + e.sets.length, 0);
            return (
              <motion.article
                key={r.id}
                className="card card-interactive routine-card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 8) * 0.03 }}
                layout
              >
                <Link to={`/routines/${r.id}`} className="routine-main" aria-label={`Edit ${r.name}`}>
                  <div className="row-between">
                    <h3 className="routine-name truncate">{r.name}</h3>
                  </div>
                  <div className="faint routine-meta">
                    {r.exercises.length} exercises · {sets} sets · {r.lastUsedAt ? `used ${relativeDay(r.lastUsedAt).toLowerCase()}` : 'never started'}
                  </div>
                  <ol className="routine-ex">
                    {r.exercises.slice(0, 5).map((e, j) => (
                      <li key={e.id}>
                        <span className="num faint">{String(j + 1).padStart(2, '0')}</span>
                        <span className="truncate">{lookup(e.exerciseId)?.name ?? 'Exercise'}</span>
                        <span className="num faint">{e.sets.length}×</span>
                      </li>
                    ))}
                    {r.exercises.length > 5 && <li className="faint routine-more">+{r.exercises.length - 5} more</li>}
                    {r.exercises.length === 0 && <li className="faint">No exercises yet — tap to build</li>}
                  </ol>
                  <div className="start-card-tags">
                    {muscles.slice(0, 5).map((m) => (
                      <span key={m} className="badge">
                        {MUSCLE_LABEL[m]}
                      </span>
                    ))}
                  </div>
                </Link>
                <div className="routine-actions">
                  <Button variant="primary" size="sm" icon="play" onClick={() => start(r)} disabled={r.exercises.length === 0}>
                    Start
                  </Button>
                  <Menu
                    label="Routine options"
                    trigger={(p) => (
                      <button type="button" className="icon-btn" aria-label={`${r.name} options`} {...p}>
                        <Icon name="more" />
                      </button>
                    )}
                  >
                    {(close) => (
                      <>
                        <MenuItem icon="edit" onSelect={() => (close(), navigate(`/routines/${r.id}`))}>
                          Edit
                        </MenuItem>
                        <MenuItem
                          icon="copy"
                          onSelect={() => {
                            close();
                            duplicateRoutine(r.id);
                            toast({ message: `Duplicated ${r.name}`, tone: 'success' });
                          }}
                        >
                          Duplicate
                        </MenuItem>
                        <MenuSep />
                        <MenuItem
                          icon="trash"
                          tone="danger"
                          onSelect={() => {
                            close();
                            const removed = deleteRoutine(r.id);
                            if (removed) toast({ message: `${r.name} deleted`, action: { label: 'Undo', run: () => restoreRoutine(removed) } });
                          }}
                        >
                          Delete
                        </MenuItem>
                      </>
                    )}
                  </Menu>
                </div>
              </motion.article>
            );
          })}
          <button type="button" className="routine-new" onClick={create}>
            <Icon name="plus" size={22} />
            New routine
          </button>
        </div>
      )}
    </div>
  );
}
