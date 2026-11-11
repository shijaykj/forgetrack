import { AnimatePresence, motion } from 'framer-motion';
import { timerRemaining, timerRunning, useTimer } from '@/store/timer';
import { useApp } from '@/store/app';
import { useNow } from '@/lib/hooks';
import { Icon } from '@/components/Icon';
import { ProgressRing } from '@/components/ui';
import { cx, fmtClock } from '@/lib/util';
import { haptic } from '@/lib/feedback';

function useRest() {
  const t = useTimer();
  const running = timerRunning(t);
  const now = useNow(250, running);
  const remaining = timerRemaining(t, now);
  const progress = t.totalMs ? remaining / t.totalMs : 0;
  return { t, running, remaining, progress, paused: t.pausedRemaining != null };
}

/** Mobile: docked at the bottom, in the thumb zone. */
export function RestDock() {
  const { t, running, remaining, progress, paused } = useRest();
  const defaultRest = useApp((s) => s.profile.defaultRestSec);
  return (
    <div className={cx('rest-dock', running && 'is-running')}>
      <AnimatePresence initial={false} mode="popLayout">
        {running ? (
          <motion.div key="run" className="rest-run" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 40 }}>
            <div className="rest-bar" aria-hidden="true">
              <motion.div className="rest-bar-fill" animate={{ scaleX: progress }} transition={{ duration: 0.25, ease: 'linear' }} />
            </div>
            <button type="button" className="rest-btn" onClick={() => (t.add(-15), haptic(6))} aria-label="Subtract 15 seconds">
              <span className="num">−15</span>
            </button>
            <button type="button" className="rest-center" onClick={() => (paused ? t.resume() : t.pause())} aria-label={paused ? 'Resume rest timer' : 'Pause rest timer'}>
              <span className="eyebrow">{paused ? 'Paused' : t.label ? `Rest · ${t.label}` : 'Rest'}</span>
              <span className={cx('rest-time num', remaining <= 10_000 && !paused && 'ending', paused && 'paused')} role="timer" aria-live="off">
                {fmtClock(Math.ceil(remaining / 1000))}
              </span>
            </button>
            <button type="button" className="rest-btn" onClick={() => (t.add(30), haptic(6))} aria-label="Add 30 seconds">
              <span className="num">+30</span>
            </button>
            <button type="button" className="rest-btn rest-skip" onClick={() => t.skip()} aria-label="Skip rest">
              <Icon name="skip" size={18} />
            </button>
          </motion.div>
        ) : (
          <motion.button
            key="idle"
            type="button"
            className="rest-idle"
            onClick={() => t.start(defaultRest)}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            aria-label={`Start a ${fmtClock(defaultRest)} rest timer`}
          >
            <Icon name="timer" size={18} />
            <span>Rest timer</span>
            <span className="num faint">{fmtClock(defaultRest)}</span>
            <span className="rest-idle-hint faint">Auto-starts when you log a set</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Desktop side panel: large ring. */
export function RestPanel() {
  const { t, running, remaining, progress, paused } = useRest();
  const defaultRest = useApp((s) => s.profile.defaultRestSec);
  return (
    <div className={cx('rest-panel', running && 'is-running')}>
      <ProgressRing value={running ? progress : 0} size={176} stroke={8} color={paused ? 'var(--text-3)' : 'var(--ember)'}>
        <div className="rest-panel-center">
          <span className="eyebrow">{running ? (paused ? 'Paused' : 'Resting') : 'Rest'}</span>
          <span className={cx('rest-panel-time num', running && remaining <= 10_000 && !paused && 'ending')}>
            {fmtClock(Math.ceil((running ? remaining : defaultRest * 1000) / 1000))}
          </span>
          {running && t.label && <span className="faint truncate rest-panel-label">{t.label}</span>}
        </div>
      </ProgressRing>
      <div className="rest-panel-controls">
        {running ? (
          <>
            <button type="button" className="rest-btn" onClick={() => t.add(-15)} aria-label="Subtract 15 seconds">
              <span className="num">−15</span>
            </button>
            <button type="button" className="rest-btn rest-btn-main" onClick={() => (paused ? t.resume() : t.pause())} aria-label={paused ? 'Resume' : 'Pause'}>
              <Icon name={paused ? 'play' : 'pause'} size={18} />
            </button>
            <button type="button" className="rest-btn" onClick={() => t.add(30)} aria-label="Add 30 seconds">
              <span className="num">+30</span>
            </button>
            <button type="button" className="rest-btn" onClick={() => t.skip()} aria-label="Skip rest">
              <Icon name="skip" size={16} />
            </button>
          </>
        ) : (
          <button type="button" className="rest-btn rest-btn-wide" onClick={() => t.start(defaultRest)}>
            <Icon name="play" size={15} /> Start {fmtClock(defaultRest)}
          </button>
        )}
      </div>
      <div className="rest-keys faint">
        <span className="kbd">T</span> pause · <span className="kbd">S</span> skip · <span className="kbd">+</span> 30s
      </div>
    </div>
  );
}
