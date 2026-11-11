import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/store/app';
import { useTimer } from '@/store/timer';
import { toast } from '@/store/ui';
import { useExerciseLookup, useNow } from '@/lib/hooks';
import { flagWorkoutPRs, workoutStats } from '@/domain/calc';
import { Button, ConfirmButton, Sheet, Switch, TextArea } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { fmtClock, fmtVolume } from '@/lib/util';

export function FinishSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const active = useApp((s) => s.active);
  const history = useApp((s) => s.workouts);
  const unit = useApp((s) => s.profile.unit);
  const { finishWorkout, discardWorkout, setWorkoutMeta, routineFromWorkout } = useApp.getState();
  const lookup = useExerciseLookup();
  const navigate = useNavigate();
  const now = useNow(1000, open);
  const [saveRoutine, setSaveRoutine] = useState(false);

  const prs = useMemo(() => (active ? flagWorkoutPRs(history, active, (id) => lookup(id)?.tracking) : new Map()), [history, active, lookup]);
  if (!active) return null;
  const st = workoutStats(active, now);
  const pending = active.exercises.reduce((n, e) => n + e.sets.filter((s) => !s.completed).length, 0);
  const nothing = st.sets === 0 && !active.exercises.some((e) => e.sets.some((s) => s.completed));

  const save = () => {
    useTimer.getState().skip();
    const done = finishWorkout();
    if (!done) {
      onClose();
      navigate('/');
      return;
    }
    if (saveRoutine && !done.routineId) {
      routineFromWorkout(done.id, done.name);
      toast({ message: 'Saved as a new routine', tone: 'success' });
    }
    onClose();
    navigate(`/history/${done.id}?done=1`, { replace: true });
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Finish workout"
      footer={
        <div className="finish-foot">
          <ConfirmButton
            variant="ghost"
            icon="trash"
            confirmLabel="Discard for good?"
            onConfirm={() => {
              useTimer.getState().skip();
              discardWorkout();
              onClose();
              navigate('/');
              toast({ message: 'Workout discarded' });
            }}
          >
            Discard
          </ConfirmButton>
          <Button variant="primary" size="lg" icon="check" onClick={save} style={{ flex: 1 }} data-autofocus>
            {nothing ? 'Close empty workout' : 'Save workout'}
          </Button>
        </div>
      }
    >
      <div className="finish">
        <div className="finish-stats">
          <div>
            <span className="eyebrow">Time</span>
            <strong className="num">{fmtClock(st.durationMs / 1000)}</strong>
          </div>
          <div>
            <span className="eyebrow">Volume</span>
            <strong className="num">
              {fmtVolume(st.volume, unit)}
              <small> {unit}</small>
            </strong>
          </div>
          <div>
            <span className="eyebrow">Sets</span>
            <strong className="num">{st.sets}</strong>
          </div>
          <div>
            <span className="eyebrow">PRs</span>
            <strong className="num" style={{ color: prs.size ? 'var(--gold)' : undefined }}>
              {prs.size}
            </strong>
          </div>
        </div>
        {pending > 0 && !nothing && (
          <p className="finish-note">
            <Icon name="info" size={16} /> {pending} unlogged set{pending > 1 ? 's' : ''} will be left out.
          </p>
        )}
        {nothing && (
          <p className="finish-note">
            <Icon name="info" size={16} /> No sets logged yet — nothing will be saved to history.
          </p>
        )}
        <TextArea label="Notes" placeholder="Energy, sleep, anything worth remembering…" value={active.notes} onChange={(e) => setWorkoutMeta('active', { notes: e.target.value })} rows={2} />
        {!active.routineId && !nothing && (
          <div className="setting-row">
            <div>
              <div className="setting-title">Save as routine</div>
              <div className="faint" style={{ fontSize: 13 }}>
                Start this exact session with one tap next time.
              </div>
            </div>
            <Switch checked={saveRoutine} onChange={setSaveRoutine} label="Save as routine" />
          </div>
        )}
      </div>
    </Sheet>
  );
}
