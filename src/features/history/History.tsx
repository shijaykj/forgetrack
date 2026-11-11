import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/store/app';
import { useDocumentTitle, useExerciseLookup, useRecords } from '@/lib/hooks';
import { prCountByWorkout, sortNewest, workoutStats } from '@/domain/calc';
import { Button, EmptyState } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { fmtDuration, fmtMonth, fmtVolume, startOfMonth } from '@/lib/util';
import { WorkoutCard } from './WorkoutCard';
import '@/styles/pages.css';
import '@/styles/dashboard.css';

export default function History() {
  useDocumentTitle('History');
  const workouts = useApp((s) => s.workouts);
  const unit = useApp((s) => s.profile.unit);
  const lookup = useExerciseLookup();
  const { events } = useRecords();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const prMap = useMemo(() => prCountByWorkout(events), [events]);

  const groups = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = sortNewest(workouts).filter(
      (w) => !term || w.name.toLowerCase().includes(term) || w.exercises.some((e) => lookup(e.exerciseId)?.name.toLowerCase().includes(term)),
    );
    const map = new Map<number, typeof list>();
    for (const w of list) {
      const k = startOfMonth(w.startedAt);
      map.set(k, [...(map.get(k) ?? []), w]);
    }
    return [...map.entries()].map(([month, items]) => {
      const st = items.map((w) => workoutStats(w));
      return {
        month,
        items,
        volume: st.reduce((a, s) => a + s.volume, 0),
        time: st.reduce((a, s) => a + s.durationMs, 0),
      };
    });
  }, [workouts, q, lookup]);

  return (
    <div className="page page-narrow">
      <div className="page-head">
        <div>
          <div className="eyebrow">{workouts.length} sessions logged</div>
          <h1>History</h1>
        </div>
      </div>
      {workouts.length === 0 ? (
        <div className="card">
          <EmptyState icon="history" title="No sessions yet" body="Every workout you finish lands here with its volume, duration and records." action={<Button variant="primary" icon="bolt" onClick={() => navigate('/start')}>Start a workout</Button>} />
        </div>
      ) : (
        <>
          <div className="pick-search history-search">
            <Icon name="search" size={18} />
            <input type="search" placeholder="Search by workout or exercise" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search history" />
          </div>
          {groups.length === 0 && <p className="muted" style={{ padding: '24px 4px' }}>Nothing matches “{q}”.</p>}
          {groups.map((g) => (
            <section key={g.month} className="hist-month">
              <div className="hist-month-head">
                <h2>{fmtMonth(g.month)}</h2>
                <span className="faint num">
                  {g.items.length} sessions · {fmtVolume(g.volume, unit)} {unit} · {fmtDuration(g.time)}
                </span>
              </div>
              <div className="stack" style={{ gap: 8 }}>
                {g.items.map((w) => (
                  <WorkoutCard key={w.id} workout={w} prs={prMap.get(w.id)} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
