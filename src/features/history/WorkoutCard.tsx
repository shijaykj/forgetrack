import { Link } from 'react-router-dom';
import { memo } from 'react';
import type { Workout } from '@/domain/types';
import { workoutStats } from '@/domain/calc';
import { useApp } from '@/store/app';
import { useExerciseLookup } from '@/lib/hooks';
import { Icon } from '@/components/Icon';
import { Badge } from '@/components/ui';
import { fmtDuration, fmtTime, fmtVolume, relativeDay } from '@/lib/util';

export const WorkoutCard = memo(function WorkoutCard({ workout, prs = 0, compact }: { workout: Workout; prs?: number; compact?: boolean }) {
  const unit = useApp((s) => s.profile.unit);
  const lookup = useExerciseLookup();
  const st = workoutStats(workout);
  const names = workout.exercises.map((e) => lookup(e.exerciseId)?.name ?? 'Exercise');
  const d = new Date(workout.startedAt);
  return (
    <Link to={`/history/${workout.id}`} className="wcard">
      <div className="wcard-date" aria-hidden="true">
        <span className="wcard-day num">{d.getDate()}</span>
        <span className="wcard-mon">{d.toLocaleString(undefined, { month: 'short' })}</span>
      </div>
      <div className="wcard-body">
        <div className="row-between">
          <div className="truncate">
            <h3 className="wcard-title truncate">{workout.name || 'Workout'}</h3>
            <div className="wcard-meta faint">
              {relativeDay(workout.startedAt)} · {fmtTime(workout.startedAt)}
            </div>
          </div>
          {prs > 0 && (
            <Badge tone="gold" icon="trophy">
              {prs} PR{prs > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <div className="wcard-stats">
          <span>
            <Icon name="clock" size={14} /> <span className="num">{fmtDuration(st.durationMs)}</span>
          </span>
          <span>
            <Icon name="layers" size={14} /> <span className="num">{st.sets}</span> sets
          </span>
          <span>
            <Icon name="dumbbell" size={14} /> <span className="num">{fmtVolume(st.volume, unit)}</span> {unit}
          </span>
        </div>
        {!compact && (
          <p className="wcard-ex truncate faint">
            {names.slice(0, 4).join(' · ')}
            {names.length > 4 && ` +${names.length - 4}`}
          </p>
        )}
      </div>
      <Icon name="chevronRight" size={18} className="wcard-chev" />
    </Link>
  );
});
