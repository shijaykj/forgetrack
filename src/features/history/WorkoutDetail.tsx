import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApp } from '@/store/app';
import { toast } from '@/store/ui';
import { useDocumentTitle, useExerciseLookup } from '@/lib/hooks';
import { exerciseVolume, flagWorkoutPRs, PR_SHORT, workoutStats } from '@/domain/calc';
import { Icon } from '@/components/Icon';
import { Badge, Button, Card, TextArea } from '@/components/ui';
import { Menu, MenuItem, MenuSep } from '@/components/Menu';
import { MUSCLE_LABEL } from '@/data/exercises';
import { cx, fmtClock, fmtDateYear, fmtDuration, fmtTime, fmtVolume, fmtWeight } from '@/lib/util';
import { fmtDurationInput } from '@/lib/util';
import { WorkoutEditor } from '../workout/WorkoutEditor';
import '@/styles/pages.css';
import '@/styles/workout.css';

export default function WorkoutDetail() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const workout = useApp((s) => s.workouts.find((w) => w.id === id));
  const history = useApp((s) => s.workouts);
  const unit = useApp((s) => s.profile.unit);
  const active = useApp((s) => s.active);
  const { deleteWorkout, restoreWorkout, startWorkout, routineFromWorkout, setWorkoutMeta } = useApp.getState();
  const lookup = useExerciseLookup();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const justDone = params.get('done') === '1';
  useDocumentTitle(workout?.name ?? 'Workout');

  const prs = useMemo(() => (workout ? flagWorkoutPRs(history, workout, (x) => lookup(x)?.tracking) : new Map()), [history, workout, lookup]);
  if (!workout) return <Navigate to="/history" replace />;
  const st = workoutStats(workout);

  const repeat = () => {
    if (active) return toast({ message: 'A workout is already in progress', action: { label: 'Open', run: () => navigate('/workout') } });
    startWorkout({ fromWorkoutId: workout.id });
    navigate('/workout');
  };
  const remove = () => {
    const w = deleteWorkout(workout.id);
    navigate('/history', { replace: true });
    if (w) toast({ message: 'Workout deleted', action: { label: 'Undo', run: () => restoreWorkout(w) } });
  };

  return (
    <div className="page page-narrow">
      <Link to="/history" className="back-link">
        <Icon name="chevronLeft" size={18} /> History
      </Link>

      {justDone && (
        <motion.div className="done-banner" initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }}>
          <div className="done-banner-glow" aria-hidden="true" />
          <span className="done-check">
            <Icon name="check" size={26} strokeWidth={3} />
          </span>
          <div style={{ flex: 1 }}>
            <strong>Session forged.</strong>
            <span className="faint">
              {prs.size > 0 ? `${prs.size} new personal record${prs.size > 1 ? 's' : ''}. ` : ''}Saved to your history.
            </span>
          </div>
          <button type="button" className="icon-btn" aria-label="Dismiss" onClick={() => setParams({}, { replace: true })}>
            <Icon name="x" size={18} />
          </button>
        </motion.div>
      )}

      <div className="page-head">
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="eyebrow">
            {fmtDateYear(workout.startedAt)} · {fmtTime(workout.startedAt)}
          </div>
          {editing ? (
            <input className="builder-name" value={workout.name} onChange={(e) => setWorkoutMeta(workout.id, { name: e.target.value.slice(0, 80) })} aria-label="Workout name" />
          ) : (
            <h1 className="truncate">{workout.name || 'Workout'}</h1>
          )}
        </div>
        <div className="page-head-actions">
          {editing ? (
            <Button variant="primary" icon="check" onClick={() => (setEditing(false), toast({ message: 'Changes saved', tone: 'success' }))}>
              Done
            </Button>
          ) : (
            <>
              <Button icon="play" onClick={repeat}>
                Repeat
              </Button>
              <Menu
                label="Workout options"
                trigger={(p) => (
                  <button type="button" className="icon-btn" aria-label="Workout options" {...p}>
                    <Icon name="more" />
                  </button>
                )}
              >
                {(close) => (
                  <>
                    <MenuItem icon="edit" onSelect={() => (close(), setEditing(true))}>
                      Edit workout
                    </MenuItem>
                    <MenuItem
                      icon="layers"
                      onSelect={() => {
                        close();
                        const rid = routineFromWorkout(workout.id);
                        if (rid) toast({ message: 'Saved as routine', tone: 'success', action: { label: 'Open', run: () => navigate(`/routines/${rid}`) } });
                      }}
                    >
                      Save as routine
                    </MenuItem>
                    <MenuItem icon="copy" onSelect={() => (close(), repeat())}>
                      Duplicate &amp; start
                    </MenuItem>
                    <MenuSep />
                    <MenuItem icon="trash" tone="danger" onSelect={() => (close(), remove())}>
                      Delete workout
                    </MenuItem>
                  </>
                )}
              </Menu>
            </>
          )}
        </div>
      </div>

      <div className="detail-stats">
        <div>
          <span className="eyebrow">Duration</span>
          <strong className="num">{fmtDuration(st.durationMs)}</strong>
        </div>
        <div>
          <span className="eyebrow">Volume</span>
          <strong className="num">
            {fmtVolume(st.volume, unit)}
            <small>{unit}</small>
          </strong>
        </div>
        <div>
          <span className="eyebrow">Sets</span>
          <strong className="num">{st.sets}</strong>
        </div>
        <div>
          <span className="eyebrow">Records</span>
          <strong className={cx('num', prs.size > 0 && 'gold')}>{prs.size}</strong>
        </div>
      </div>

      {editing ? (
        <>
          <div className="edit-hint">
            <Icon name="info" size={16} /> Editing a past session. Records and analytics recalculate automatically.
          </div>
          <WorkoutEditor target={workout.id} workout={workout} live={false} />
          <TextArea label="Notes" value={workout.notes} onChange={(e) => setWorkoutMeta(workout.id, { notes: e.target.value })} rows={2} />
        </>
      ) : (
        <>
          {workout.notes && (
            <Card className="detail-notes">
              <Icon name="note" size={16} />
              <p>{workout.notes}</p>
            </Card>
          )}
          <div className="stack" style={{ gap: 10 }}>
            {workout.exercises.map((we) => {
              const ex = lookup(we.exerciseId);
              const vol = exerciseVolume(we);
              let n = 0;
              return (
                <Card key={we.id} className="detail-ex">
                  <div className="row-between">
                    <div style={{ minWidth: 0 }}>
                      <Link to={`/exercises/${we.exerciseId}`} className="ex-name">
                        {ex?.name ?? 'Unknown exercise'}
                      </Link>
                      <div className="ex-sub">
                        {we.supersetId && <span className="ss-tag">Superset</span>}
                        {ex && <span>{MUSCLE_LABEL[ex.primaryMuscle]}</span>}
                      </div>
                    </div>
                    {vol > 0 && (
                      <span className="faint num" style={{ fontSize: 13 }}>
                        {fmtVolume(vol, unit)} {unit}
                      </span>
                    )}
                  </div>
                  {we.notes && <p className="detail-ex-note">{we.notes}</p>}
                  <ol className="detail-sets">
                    {we.sets.map((s) => {
                      if (s.type !== 'warmup') n++;
                      const kinds = prs.get(s.id);
                      return (
                        <li key={s.id} className={cx(s.type !== 'normal' && `st-${s.type}`)}>
                          <span className="detail-set-n num">{s.type === 'warmup' ? 'W' : s.type === 'drop' ? 'D' : s.type === 'failure' ? 'F' : n}</span>
                          <span className="num detail-set-v">
                            {ex?.tracking === 'duration'
                              ? `${fmtDurationInput(s.durationSec)}${(s.durationSec ?? 0) < 60 ? ' s' : ''}`
                              : `${s.weight ? `${fmtWeight(s.weight, unit)} ${unit} × ` : ''}${s.reps ?? 0}${s.weight ? '' : ' reps'}`}
                          </span>
                          {kinds && (
                            <Badge tone="gold" icon="trophy">
                              {kinds.map((k: keyof typeof PR_SHORT) => PR_SHORT[k]).join(' · ')}
                            </Badge>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </Card>
              );
            })}
          </div>
          <p className="faint detail-foot">
            Started {fmtTime(workout.startedAt)}
            {workout.endedAt && ` · finished ${fmtTime(workout.endedAt)} · ${fmtClock((workout.endedAt - workout.startedAt) / 1000)}`}
          </p>
        </>
      )}
    </div>
  );
}
