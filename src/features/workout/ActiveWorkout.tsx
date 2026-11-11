import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApp } from '@/store/app';
import { timerRunning, useTimer } from '@/store/timer';
import { useDocumentTitle, useExerciseLookup, useIsDesktop, useNow } from '@/lib/hooks';
import { flagWorkoutPRs, workoutStats } from '@/domain/calc';
import { Icon } from '@/components/Icon';
import { Button, IconButton, TextArea } from '@/components/ui';
import { cx, fmtClock, fmtVolume } from '@/lib/util';
import { WorkoutEditor } from './WorkoutEditor';
import { RestDock, RestPanel } from './RestTimer';
import { FinishSheet } from './FinishSheet';
import '@/styles/workout.css';

export default function ActiveWorkout() {
  const active = useApp((s) => s.active);
  const setMeta = useApp((s) => s.setWorkoutMeta);
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const now = useNow(1000, !!active);
  const [finishing, setFinishing] = useState(false);
  useDocumentTitle(active ? fmtClock((now - active.startedAt) / 1000) : 'Workout');

  // Desktop shortcuts for the rest timer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || el.closest('input, textarea, select, [role="dialog"], [role="menu"]')) return;
      const t = useTimer.getState();
      if (e.key === 't' || e.key === 'T') {
        if (!timerRunning(t)) t.start(useApp.getState().profile.defaultRestSec);
        else if (t.pausedRemaining != null) t.resume();
        else t.pause();
      } else if (e.key === 's' || e.key === 'S') t.skip();
      else if (e.key === '+' || e.key === '=') t.add(30);
      else if (e.key === '-') t.add(-15);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!active) return <Navigate to="/start" replace />;

  const total = active.exercises.reduce((n, e) => n + e.sets.length, 0);
  const done = active.exercises.reduce((n, e) => n + e.sets.filter((s) => s.completed).length, 0);

  return (
    <div className="wo">
      <header className="wo-head">
        <div className="wo-head-in">
          <IconButton icon="chevronDown" label="Minimise workout" onClick={() => navigate('/')} />
          <div className="wo-head-title">
            <input
              className="wo-name"
              value={active.name}
              aria-label="Workout name"
              onChange={(e) => setMeta('active', { name: e.target.value.slice(0, 80) })}
            />
            <div className="wo-head-meta">
              <span className="live-dot" />
              <span className="num">{fmtClock((now - active.startedAt) / 1000)}</span>
              <span className="faint">
                · {done}/{total} sets
              </span>
            </div>
          </div>
          <Button variant="primary" size="sm" icon="flag" onClick={() => setFinishing(true)}>
            Finish
          </Button>
        </div>
        <div className="wo-progress" aria-hidden="true">
          <motion.div className="wo-progress-fill" animate={{ scaleX: total ? done / total : 0 }} transition={{ type: 'spring', stiffness: 200, damping: 30 }} />
        </div>
      </header>

      <div className="wo-layout">
        <div className="wo-main">
          <WorkoutEditor target="active" workout={active} live />
        </div>
        {isDesktop && <SidePanel onFinish={() => setFinishing(true)} />}
      </div>

      {!isDesktop && <RestDock />}
      <FinishSheet open={finishing} onClose={() => setFinishing(false)} />
    </div>
  );
}

function SidePanel({ onFinish }: { onFinish: () => void }) {
  const active = useApp((s) => s.active)!;
  const history = useApp((s) => s.workouts);
  const unit = useApp((s) => s.profile.unit);
  const setMeta = useApp((s) => s.setWorkoutMeta);
  const lookup = useExerciseLookup();
  const now = useNow(1000);
  const st = workoutStats(active, now);
  const prs = useMemo(() => flagWorkoutPRs(history, active, (id) => lookup(id)?.tracking).size, [history, active, lookup]);

  return (
    <aside className="wo-side" aria-label="Session panel">
      <div className="card wo-side-card">
        <RestPanel />
      </div>
      <div className="card wo-side-card">
        <div className="wo-side-stats">
          <div>
            <div className="eyebrow">Duration</div>
            <div className="num wo-side-num">{fmtClock(st.durationMs / 1000)}</div>
          </div>
          <div>
            <div className="eyebrow">Volume</div>
            <div className="num wo-side-num">
              {fmtVolume(st.volume, unit)}
              <small>{unit}</small>
            </div>
          </div>
          <div>
            <div className="eyebrow">Sets</div>
            <div className="num wo-side-num">{st.sets}</div>
          </div>
          <div>
            <div className="eyebrow">PRs</div>
            <div className={cx('num wo-side-num', prs > 0 && 'gold')}>{prs}</div>
          </div>
        </div>
        <div className="divider" style={{ margin: '16px 0' }} />
        <div className="eyebrow" style={{ marginBottom: 10 }}>
          Exercises
        </div>
        <ol className="wo-nav">
          {active.exercises.map((e, i) => {
            const d = e.sets.filter((s) => s.completed).length;
            const all = e.sets.length;
            return (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => document.querySelectorAll('.ex-block')[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className={cx('wo-nav-item', d === all && all > 0 && 'done')}
                >
                  <span className="wo-nav-bar">
                    <span style={{ transform: `scaleY(${all ? d / all : 0})` }} />
                  </span>
                  <span className="truncate">{lookup(e.exerciseId)?.name ?? 'Exercise'}</span>
                  <span className="num faint">
                    {d}/{all}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="divider" style={{ margin: '16px 0' }} />
        <TextArea label="Session notes" placeholder="How did it feel?" value={active.notes} onChange={(e) => setMeta('active', { notes: e.target.value })} rows={2} />
        <Button variant="primary" size="lg" block icon="flag" onClick={onFinish} style={{ marginTop: 14 }}>
          Finish workout
        </Button>
      </div>
      <p className="faint wo-side-hint">
        <Icon name="keyboard" size={14} /> <span className="kbd">Enter</span> logs a set · <span className="kbd">↑</span>
        <span className="kbd">↓</span> adjust
      </p>
    </aside>
  );
}
