import { useDeferredValue, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '@/store/app';
import { useAllExercises, useDocumentTitle } from '@/lib/hooks';
import { exerciseFrequency } from '@/domain/analytics';
import { EQUIPMENT_LABEL, MUSCLE_LABEL } from '@/data/exercises';
import { MUSCLE_GROUPS, type MuscleGroup } from '@/domain/types';
import { Icon } from '@/components/Icon';
import { Button, Chip, Sheet } from '@/components/ui';
import { cx, relativeDay } from '@/lib/util';
import { CustomExerciseForm } from './CustomExerciseForm';
import '@/styles/pages.css';
import '@/styles/workout.css';

export default function Exercises() {
  useDocumentTitle('Exercises');
  const all = useAllExercises();
  const workouts = useApp((s) => s.workouts);
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const dq = useDeferredValue(q);
  const [muscle, setMuscle] = useState<MuscleGroup | 'custom' | null>(null);
  const [creating, setCreating] = useState(false);
  const freq = useMemo(() => new Map(exerciseFrequency(workouts).map((f) => [f.exerciseId, f])), [workouts]);

  const list = useMemo(() => {
    const t = dq.trim().toLowerCase();
    return all.filter((e) => {
      if (muscle === 'custom' && !e.isCustom) return false;
      if (muscle && muscle !== 'custom' && e.primaryMuscle !== muscle) return false;
      return !t || `${e.name} ${EQUIPMENT_LABEL[e.equipment]}`.toLowerCase().includes(t);
    });
  }, [all, dq, muscle]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">{all.length} movements</div>
          <h1>Exercise library</h1>
        </div>
        <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>
          Custom exercise
        </Button>
      </div>
      <div className="pick-search history-search">
        <Icon name="search" size={18} />
        <input type="search" placeholder="Search exercises or equipment" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search exercises" />
      </div>
      <div className="pick-filters lib-filters" role="group" aria-label="Filter by muscle">
        <Chip active={!muscle} onClick={() => setMuscle(null)}>
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
      <div className="lib-grid">
        {list.map((e) => {
          const f = freq.get(e.id);
          return (
            <Link key={e.id} to={`/exercises/${e.id}`} className="lib-card">
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
                </span>
              </span>
              {f && <span className="lib-last faint">{relativeDay(f.last)}</span>}
            </Link>
          );
        })}
      </div>
      {list.length === 0 && (
        <div className="pick-none">
          <p className="muted">No exercises match.</p>
          <Button icon="plus" onClick={() => setCreating(true)} style={{ marginTop: 12 }}>
            Create “{q || 'custom exercise'}”
          </Button>
        </div>
      )}
      <Sheet open={creating} onClose={() => setCreating(false)} title="Custom exercise" size="lg">
        <CustomExerciseForm initialName={q} onCancel={() => setCreating(false)} onSaved={(id) => (setCreating(false), navigate(`/exercises/${id}`))} />
      </Sheet>
    </div>
  );
}
