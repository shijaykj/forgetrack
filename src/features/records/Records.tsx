import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApp } from '@/store/app';
import { useDocumentTitle, useExerciseLookup, useRecords } from '@/lib/hooks';
import { kindsFor, PR_LABEL, PR_SHORT } from '@/domain/calc';
import type { PRKind } from '@/domain/types';
import { MUSCLE_LABEL } from '@/data/exercises';
import { Icon } from '@/components/Icon';
import { Button, Card, EmptyState, SectionHeader } from '@/components/ui';
import { fmtDate, fmtWeight, relativeDay } from '@/lib/util';
import '@/styles/pages.css';
import '@/styles/dashboard.css';

export default function Records() {
  useDocumentTitle('Records');
  const { book, events } = useRecords();
  const unit = useApp((s) => s.profile.unit);
  const lookup = useExerciseLookup();
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return [...book.entries()]
      .map(([id, rec]) => ({ id, ex: lookup(id), rec, last: Math.max(...Object.values(rec).map((r) => r!.date)) }))
      .filter((r) => r.ex && (!term || r.ex.name.toLowerCase().includes(term)))
      .sort((a, b) => b.last - a.last);
  }, [book, lookup, q]);

  const recent = events.slice().sort((a, b) => b.date - a.date).slice(0, 12);

  const fmtRec = (kind: PRKind, value: number, weight: number, reps: number) => {
    if (kind === 'reps') return { main: `${value}`, unit: 'reps', sub: weight ? `@ ${fmtWeight(weight, unit)} ${unit}` : 'bodyweight' };
    if (kind === 'volume') return { main: fmtWeight(value, unit), unit, sub: `${fmtWeight(weight, unit)} × ${reps}` };
    if (kind === 'e1rm') return { main: fmtWeight(value, unit), unit, sub: `from ${fmtWeight(weight, unit)} × ${reps}` };
    return { main: fmtWeight(value, unit), unit, sub: `× ${reps} rep${reps > 1 ? 's' : ''}` };
  };

  if (book.size === 0) {
    return (
      <div className="page page-narrow">
        <div className="page-head">
          <div>
            <div className="eyebrow">Hall of iron</div>
            <h1>Personal records</h1>
          </div>
        </div>
        <Card>
          <EmptyState icon="trophy" title="Records appear automatically" body="Every logged set is compared against your history for heaviest weight, best estimated 1RM, best set volume and most reps." action={<Button variant="primary" icon="bolt" onClick={() => navigate('/start')}>Start a workout</Button>} />
        </Card>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Hall of iron · {events.length} PRs set</div>
          <h1>Personal records</h1>
        </div>
      </div>

      <div className="rec-layout">
        <div className="rec-main">
          <div className="pick-search history-search">
            <Icon name="search" size={18} />
            <input type="search" placeholder="Filter exercises" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter records" />
          </div>
          <div className="stack" style={{ gap: 10 }}>
            {rows.map(({ id, ex, rec }, i) => (
              <motion.div key={id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.025 }}>
                <Card className="rec-card">
                  <Link to={`/exercises/${id}`} className="rec-head">
                    <div style={{ minWidth: 0 }}>
                      <h3 className="truncate">{ex!.name}</h3>
                      <span className="faint" style={{ fontSize: 12.5 }}>
                        {MUSCLE_LABEL[ex!.primaryMuscle]}
                      </span>
                    </div>
                    <Icon name="chevronRight" size={18} className="faint" />
                  </Link>
                  <div className="rec-tiles">
                    {kindsFor(ex!.tracking).map((k) => {
                      const r = rec[k];
                      if (!r) return null;
                      const f = fmtRec(k, r.value, r.weight, r.reps);
                      return (
                        <div key={k} className="rec-tile">
                          <span className="eyebrow">{PR_LABEL[k]}</span>
                          <strong className="num">
                            {f.main}
                            <small> {f.unit}</small>
                          </strong>
                          <span className="faint">{f.sub}</span>
                          <span className="faint rec-date">{fmtDate(r.date)}</span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
        <Card className="rec-side">
          <SectionHeader eyebrow="Timeline" title="Recent PRs" />
          {recent.length === 0 ? (
            <p className="muted" style={{ fontSize: 14 }}>
              Beat any previous best and it shows up here.
            </p>
          ) : (
            <ol className="timeline">
              {recent.map((e, i) => {
                const f = fmtRec(e.kind, e.value, e.weight, e.reps);
                return (
                  <li key={`${e.setId}-${e.kind}-${i}`}>
                    <span className="tl-dot" aria-hidden="true" />
                    <div className="tl-body">
                      <div className="row-between">
                        <strong className="truncate">{lookup(e.exerciseId)?.name}</strong>
                        <span className="badge badge-gold">{PR_SHORT[e.kind]}</span>
                      </div>
                      <span className="faint num">
                        {f.main} {f.unit} · {relativeDay(e.date)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}
