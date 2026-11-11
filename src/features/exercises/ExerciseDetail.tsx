import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '@/store/app';
import { toast } from '@/store/ui';
import { useDocumentTitle, useExerciseLookup, useRecords } from '@/lib/hooks';
import { exerciseSessions } from '@/domain/analytics';
import { kindsFor, PR_LABEL } from '@/domain/calc';
import { CATEGORY_LABEL, EQUIPMENT_LABEL, MUSCLE_LABEL, TRACKING_LABEL } from '@/data/exercises';
import { Icon } from '@/components/Icon';
import { Badge, Button, Card, ConfirmButton, SectionHeader, Segmented, Sheet } from '@/components/ui';
import { LineChart } from '@/components/charts';
import { fmtDate, fmtNum, fmtVolume, fmtWeight, toDisplay } from '@/lib/util';
import { fmtDurationInput } from '@/lib/util';
import { CustomExerciseForm } from './CustomExerciseForm';
import '@/styles/pages.css';
import '@/styles/dashboard.css';

export default function ExerciseDetail() {
  const { id = '' } = useParams();
  const lookup = useExerciseLookup();
  const ex = lookup(id);
  const workouts = useApp((s) => s.workouts);
  const unit = useApp((s) => s.profile.unit);
  const del = useApp((s) => s.deleteCustomExercise);
  const { book, events } = useRecords();
  const navigate = useNavigate();
  const [metric, setMetric] = useState<'e1rm' | 'top' | 'volume'>('e1rm');
  const [editing, setEditing] = useState(false);
  const [limit, setLimit] = useState(8);
  useDocumentTitle(ex?.name ?? 'Exercise');

  const sessions = useMemo(() => exerciseSessions(workouts, id), [workouts, id]);
  if (!ex) return <Navigate to="/exercises" replace />;
  const rec = book.get(id) ?? {};
  const prWorkouts = new Set(events.filter((e) => e.exerciseId === id && e.kind === (metric === 'top' ? 'weight' : metric)).map((e) => e.workoutId));
  const isDuration = ex.tracking === 'duration';
  const series = sessions
    .map((s) => ({
      t: s.date,
      value: isDuration ? Math.max(...s.sets.map((x) => x.durationSec)) : toDisplay(metric === 'e1rm' ? s.bestE1RM : metric === 'top' ? s.topWeight : s.volume, unit),
      marker: prWorkouts.has(s.workoutId),
    }))
    .filter((p) => p.value > 0);
  const inUse = workouts.some((w) => w.exercises.some((e) => e.exerciseId === id));

  return (
    <div className="page">
      <button type="button" className="back-link" onClick={() => (history.length > 1 ? navigate(-1) : navigate('/exercises'))}>
        <Icon name="chevronLeft" size={18} /> Back
      </button>
      <div className="page-head">
        <div style={{ minWidth: 0 }}>
          <div className="eyebrow">
            {MUSCLE_LABEL[ex.primaryMuscle]} · {EQUIPMENT_LABEL[ex.equipment]}
          </div>
          <h1>{ex.name}</h1>
          <div className="row" style={{ marginTop: 10, flexWrap: 'wrap', gap: 6 }}>
            <Badge tone="ember">{CATEGORY_LABEL[ex.category]}</Badge>
            {ex.secondaryMuscles.map((m) => (
              <Badge key={m}>{MUSCLE_LABEL[m]}</Badge>
            ))}
            {ex.isCustom && <Badge tone="steel">Custom</Badge>}
          </div>
        </div>
        {ex.isCustom && (
          <div className="page-head-actions">
            <Button icon="edit" onClick={() => setEditing(true)}>
              Edit
            </Button>
            {!inUse && (
              <ConfirmButton
                variant="ghost"
                icon="trash"
                confirmLabel="Delete?"
                onConfirm={() => {
                  del(ex.id);
                  toast({ message: `${ex.name} deleted` });
                  navigate('/exercises', { replace: true });
                }}
              >
                Delete
              </ConfirmButton>
            )}
          </div>
        )}
      </div>

      <div className="ed-grid">
        <div className="stack">
          {!isDuration && kindsFor(ex.tracking).some((k) => rec[k]) && (
            <div className="rec-tiles ed-records">
              {kindsFor(ex.tracking).map((k) => {
                const r = rec[k];
                if (!r) return null;
                return (
                  <div key={k} className="rec-tile">
                    <span className="eyebrow">{PR_LABEL[k]}</span>
                    <strong className="num">
                      {k === 'reps' ? r.value : fmtWeight(r.value, unit)}
                      <small> {k === 'reps' ? 'reps' : unit}</small>
                    </strong>
                    <span className="faint">
                      {fmtWeight(r.weight, unit)} × {r.reps} · {fmtDate(r.date)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <Card>
            <SectionHeader
              eyebrow="Progression"
              title={isDuration ? 'Longest hold' : metric === 'e1rm' ? 'Estimated 1RM' : metric === 'top' ? 'Top set weight' : 'Session volume'}
              action={
                !isDuration && (
                  <Segmented
                    size="sm"
                    label="Metric"
                    value={metric}
                    onChange={setMetric}
                    options={[
                      { value: 'e1rm', label: 'e1RM' },
                      { value: 'top', label: 'Top' },
                      { value: 'volume', label: 'Vol' },
                    ]}
                  />
                )
              }
            />
            <LineChart data={series} height={240} format={(v) => (isDuration ? fmtDurationInput(Math.round(v)) : metric === 'volume' ? fmtNum(v) : String(Math.round(v * 10) / 10))} />
          </Card>

          <Card>
            <SectionHeader eyebrow={`${sessions.length} sessions`} title="History" />
            {sessions.length === 0 ? (
              <p className="muted" style={{ fontSize: 14 }}>
                Not logged yet. It'll show every session here, set by set.
              </p>
            ) : (
              <ol className="ed-history">
                {sessions
                  .slice()
                  .reverse()
                  .slice(0, limit)
                  .map((s) => (
                    <li key={s.workoutId}>
                      <Link to={`/history/${s.workoutId}`} className="ed-sess">
                        <div className="row-between">
                          <strong>{fmtDate(s.date)}</strong>
                          {!isDuration && (
                            <span className="faint num" style={{ fontSize: 12.5 }}>
                              {s.bestE1RM ? `e1RM ${fmtWeight(s.bestE1RM, unit)} · ` : ''}
                              {fmtVolume(s.volume, unit)} {unit}
                            </span>
                          )}
                        </div>
                        <div className="ed-sets">
                          {s.sets.map((x, i) => (
                            <span key={i} className={x.type === 'warmup' ? 'faint' : ''}>
                              {isDuration ? fmtDurationInput(x.durationSec) : `${x.weight ? fmtWeight(x.weight, unit) + '×' : ''}${x.reps}`}
                            </span>
                          ))}
                        </div>
                      </Link>
                    </li>
                  ))}
              </ol>
            )}
            {sessions.length > limit && (
              <Button variant="ghost" size="sm" onClick={() => setLimit((l) => l + 20)} style={{ marginTop: 8 }}>
                Show more
              </Button>
            )}
          </Card>
        </div>

        <Card className="ed-side">
          <SectionHeader eyebrow="Technique" title="How to" />
          {ex.instructions.length ? (
            <ol className="steps">
              {ex.instructions.map((s, i) => (
                <li key={i}>
                  <span className="num">{i + 1}</span>
                  <p>{s}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted" style={{ fontSize: 14 }}>
              No instructions added.
            </p>
          )}
          <div className="divider" style={{ margin: '16px 0' }} />
          <dl className="ed-facts">
            <div>
              <dt>Tracking</dt>
              <dd>{TRACKING_LABEL[ex.tracking]}</dd>
            </div>
            <div>
              <dt>Default rest</dt>
              <dd>{ex.defaultRestSec ? `${Math.floor(ex.defaultRestSec / 60)}:${String(ex.defaultRestSec % 60).padStart(2, '0')}` : 'App default'}</dd>
            </div>
          </dl>
          <p className="faint" style={{ fontSize: 12, marginTop: 12 }}>
            Cues are general guidance, not coaching or medical advice.
          </p>
        </Card>
      </div>

      <Sheet open={editing} onClose={() => setEditing(false)} title="Edit exercise" size="lg">
        <CustomExerciseForm initial={ex} onCancel={() => setEditing(false)} onSaved={() => setEditing(false)} />
      </Sheet>
    </div>
  );
}
