import { Suspense, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon, Logo, type IconName } from '@/components/Icon';
import { useApp } from '@/store/app';
import { timerRemaining, useTimer } from '@/store/timer';
import { useUI } from '@/store/ui';
import { useNow } from '@/lib/hooks';
import { chime, haptic } from '@/lib/feedback';
import { isNative, restAlertPermission, requestRestAlerts, setKeepAwake, syncRestNotification, syncWorkoutActivity } from '@/lib/native';
import { useExerciseLookup } from '@/lib/hooks';
import { cx, fmtClock } from '@/lib/util';
import { PR_SHORT } from '@/domain/calc';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const RAIL: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/', label: 'Today', icon: 'home', end: true },
  { to: '/routines', label: 'Routines', icon: 'layers' },
  { to: '/history', label: 'History', icon: 'history' },
  { to: '/analytics', label: 'Progress', icon: 'chart' },
  { to: '/records', label: 'Records', icon: 'trophy' },
  { to: '/exercises', label: 'Exercises', icon: 'dumbbell' },
];

export function Shell() {
  const location = useLocation();
  const active = useApp((s) => s.active);
  const onWorkout = location.pathname === '/workout';

  return (
    <div className={cx('shell', onWorkout && 'shell-workout')}>
      <Rail />
      <main className="main" id="main">
        <Suspense fallback={<PageSkeleton />}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname.split('/').slice(0, 3).join('/')}
              className="page-motion"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <ErrorBoundary resetKey={location.pathname}>
                <Outlet />
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </main>
      {active && !onWorkout && <LiveBar />}
      {!onWorkout && <BottomNav />}
      <TimerWatcher />
      <PlatformSync />
      <Toaster workout={onWorkout} />
      <Celebration />
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="page">
      <div className="skeleton" style={{ height: 34, width: 220, marginBottom: 24 }} />
      <div className="skeleton" style={{ height: 180, marginBottom: 16 }} />
      <div className="skeleton" style={{ height: 120 }} />
    </div>
  );
}

function Rail() {
  const active = useApp((s) => s.active);
  const name = useApp((s) => s.profile.name);
  const navigate = useNavigate();
  const now = useNow(1000, !!active);
  return (
    <aside className="rail" aria-label="Primary">
      <NavLink to="/" className="rail-brand" aria-label="ForgeTrack home">
        <Logo size={30} />
        <span className="brand-word">
          FORGE<span>TRACK</span>
        </span>
      </NavLink>

      <button
        type="button"
        className={cx('rail-cta', active && 'rail-cta-live')}
        onClick={() => navigate(active ? '/workout' : '/start')}
      >
        {active ? (
          <>
            <span className="live-dot" />
            <span className="rail-cta-text">
              <span>Live workout</span>
              <span className="num">{fmtClock((now - active.startedAt) / 1000)}</span>
            </span>
            <Icon name="arrowRight" size={18} />
          </>
        ) : (
          <>
            <Icon name="bolt" size={18} />
            <span>Start workout</span>
            <span className="kbd rail-kbd">N</span>
          </>
        )}
      </button>

      <nav className="rail-nav">
        {RAIL.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => cx('rail-link', isActive && 'is-active')}>
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId="rail-pill" className="rail-pill" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                <Icon name={item.icon} size={19} />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="rail-foot">
        <NavLink to="/settings" className={({ isActive }) => cx('rail-link', isActive && 'is-active')}>
          {({ isActive }) => (
            <>
              {isActive && <motion.span layoutId="rail-pill" className="rail-pill" />}
              <Icon name="settings" size={19} />
              <span>Settings</span>
            </>
          )}
        </NavLink>
        <div className="rail-user">
          <div className="avatar">{(name || 'A').slice(0, 1).toUpperCase()}</div>
          <div className="truncate">
            <div className="rail-user-name truncate">{name || 'Athlete'}</div>
            <div className="faint" style={{ fontSize: 12 }}>
              Local · unlimited
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

const TABS: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/', label: 'Today', icon: 'home', end: true },
  { to: '/routines', label: 'Routines', icon: 'layers' },
  { to: '/analytics', label: 'Progress', icon: 'chart' },
  { to: '/history', label: 'History', icon: 'history' },
];

function BottomNav() {
  const active = useApp((s) => s.active);
  const navigate = useNavigate();
  const tabs = [TABS[0], TABS[1]];
  const tabs2 = [TABS[2], TABS[3]];
  const link = (t: (typeof TABS)[number]) => (
    <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => cx('tab', isActive && 'is-active')}>
      {({ isActive }) => (
        <>
          <span className="tab-icon">
            <Icon name={t.icon} size={22} strokeWidth={isActive ? 2.1 : 1.75} />
          </span>
          <span className="tab-label">{t.label}</span>
          {isActive && <motion.span layoutId="tab-bar" className="tab-bar" transition={{ type: 'spring', stiffness: 520, damping: 40 }} />}
        </>
      )}
    </NavLink>
  );
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {tabs.map(link)}
      <button
        type="button"
        className={cx('forge-btn', active && 'forge-btn-live')}
        aria-label={active ? 'Resume workout' : 'Start workout'}
        onClick={() => {
          haptic(10);
          navigate(active ? '/workout' : '/start');
        }}
      >
        <Icon name={active ? 'play' : 'plus'} size={26} strokeWidth={2.4} />
      </button>
      {tabs2.map(link)}
    </nav>
  );
}

/** Persistent strip above the bottom nav while a workout is in progress. */
function LiveBar() {
  const active = useApp((s) => s.active)!;
  const timer = useTimer();
  const now = useNow(1000);
  const navigate = useNavigate();
  const rest = timerRemaining(timer, now);
  const done = active.exercises.reduce((n, e) => n + e.sets.filter((s) => s.completed).length, 0);
  const total = active.exercises.reduce((n, e) => n + e.sets.length, 0);
  return (
    <motion.button
      type="button"
      className="live-bar"
      onClick={() => navigate('/workout')}
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      aria-label="Return to live workout"
    >
      <span className="live-dot" />
      <span className="live-bar-text truncate">
        <strong className="truncate">{active.name}</strong>
        <span className="faint num">
          {fmtClock((now - active.startedAt) / 1000)} · {done}/{total} sets
        </span>
      </span>
      {rest > 0 && (
        <span className="live-bar-rest num">
          <Icon name="timer" size={15} /> {fmtClock(rest / 1000)}
        </span>
      )}
      <Icon name="chevronRight" size={18} />
    </motion.button>
  );
}

/** Fires the end-of-rest cue exactly once, wherever the user is in the app. */
function TimerWatcher() {
  const endsAt = useTimer((s) => s.endsAt);
  const markFinished = useTimer((s) => s.markFinished);
  useEffect(() => {
    if (!endsAt) return;
    const fire = () => {
      markFinished();
      chime();
      haptic([60, 40, 60]);
      // On iPhone the rest alert is a scheduled system notification (see PlatformSync).
      if (!isNative && document.visibilityState === 'hidden' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification('Rest complete', { body: 'Time for your next set.', tag: 'forgetrack-rest', silent: false });
        } catch {
          /* some platforms require a service worker for notifications */
        }
      }
    };
    const ms = endsAt - Date.now();
    if (ms <= 0) {
      // Timer expired while the app was closed — clear it silently if long past.
      if (ms < -5000) markFinished();
      else fire();
      return;
    }
    const t = setTimeout(fire, ms);
    // Re-check on resume: browsers throttle timers in background tabs.
    const vis = () => {
      if (document.visibilityState === 'visible' && Date.now() >= endsAt) fire();
    };
    document.addEventListener('visibilitychange', vis);
    return () => {
      clearTimeout(t);
      document.removeEventListener('visibilitychange', vis);
    };
  }, [endsAt, markFinished]);
  return null;
}

function Toaster({ workout }: { workout: boolean }) {
  const toasts = useUI((s) => s.toasts);
  const dismiss = useUI((s) => s.dismiss);
  return (
    <div className="toaster" data-workout={workout} role="status" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <ToastItem key={t.id} id={t.id} ttl={t.ttl} onDone={dismiss}>
            <div className={cx('toast', t.tone && `toast-${t.tone}`)}>
              <span className="toast-msg">{t.message}</span>
              {t.action && (
                <button
                  type="button"
                  className="toast-action"
                  onClick={() => {
                    t.action!.run();
                    dismiss(t.id);
                  }}
                >
                  {t.action.label}
                </button>
              )}
            </div>
          </ToastItem>
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ id, ttl, onDone, children }: { id: string; ttl: number; onDone: (id: string) => void; children: React.ReactNode }) {
  useEffect(() => {
    const t = setTimeout(() => onDone(id), ttl);
    return () => clearTimeout(t);
  }, [id, ttl, onDone]);
  return (
    <motion.div layout initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.97 }} transition={{ type: 'spring', stiffness: 520, damping: 38 }}>
      {children}
    </motion.div>
  );
}

/** Non-blocking PR celebration banner with a quick spark burst. */
function Celebration() {
  const c = useUI((s) => s.celebration);
  const clear = useUI((s) => s.clearCelebration);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!c) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(clear, 3200);
    return () => clearTimeout(timer.current);
  }, [c, clear]);
  return (
    <div className="celebrate-layer" aria-live="assertive">
      <AnimatePresence>
        {c && (
          <motion.button
            type="button"
            key={c.id}
            className="celebrate"
            onClick={clear}
            initial={{ y: -40, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -30, opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
          >
            <span className="celebrate-sparks" aria-hidden="true">
              {Array.from({ length: 10 }, (_, i) => (
                <motion.i
                  key={i}
                  initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                  animate={{
                    opacity: 0,
                    x: Math.cos((i / 10) * Math.PI * 2) * 46,
                    y: Math.sin((i / 10) * Math.PI * 2) * 46,
                    scale: 0.4,
                  }}
                  transition={{ duration: 0.9, ease: 'easeOut', delay: 0.08 }}
                />
              ))}
            </span>
            <span className="celebrate-medal">
              <Icon name="trophy" size={22} strokeWidth={2} />
            </span>
            <span className="celebrate-text">
              <span className="eyebrow" style={{ color: 'var(--gold)' }}>
                New personal record
              </span>
              <strong>{c.exerciseName}</strong>
              <span className="faint">
                {c.kinds.map((k) => PR_SHORT[k]).join(' · ')} — {c.detail}
              </span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Bridges app state to platform services:
 *  - keeps the screen awake while a workout is live (if enabled),
 *  - on iPhone, mirrors the rest timer into a scheduled system notification so
 *    the alert arrives even with the phone locked, and asks for notification
 *    permission the first time a workout starts.
 */
function PlatformSync() {
  const live = useApp((s) => s.active != null);
  const keepAwake = useApp((s) => s.profile.keepAwake);
  const endsAt = useTimer((s) => s.endsAt);
  const label = useTimer((s) => s.label);

  useEffect(() => {
    void setKeepAwake(live && keepAwake);
  }, [live, keepAwake]);
  useEffect(() => () => void setKeepAwake(false), []);

  useEffect(() => {
    if (!isNative || !live) return;
    void restAlertPermission().then((p) => p === 'prompt' && requestRestAlerts());
  }, [live]);

  useEffect(() => {
    void syncRestNotification(endsAt, label);
  }, [endsAt, label]);

  // Live Activity: mirrors the live workout onto the lock screen and Dynamic Island.
  const active = useApp((s) => s.active);
  const pausedRemaining = useTimer((s) => s.pausedRemaining);
  const totalMs = useTimer((s) => s.totalMs);
  const lookup = useExerciseLookup();
  useEffect(() => {
    if (!isNative) return;
    if (!active) return syncWorkoutActivity(null);
    let done = 0;
    let total = 0;
    let current = '';
    for (const e of active.exercises) {
      for (const s of e.sets) {
        total++;
        if (s.completed) done++;
        else if (!current) current = lookup(e.exerciseId)?.name ?? '';
      }
    }
    syncWorkoutActivity({
      workoutName: active.name,
      startedAt: active.startedAt,
      restEndsAt: endsAt,
      restTotalSec: Math.round(totalMs / 1000),
      pausedRemainingSec: pausedRemaining != null ? Math.round(pausedRemaining / 1000) : null,
      setsDone: done,
      setsTotal: total,
      currentExercise: current,
    });
  }, [active, endsAt, pausedRemaining, totalMs, lookup]);

  return null;
}
