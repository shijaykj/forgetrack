import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApp } from '@/store/app';
import { useDocumentTitle, useExerciseLookup, useNow, useRecords } from '@/lib/hooks';
import { Icon, Logo } from '@/components/Icon';
import { Button, Card, EmptyState, NumberTicker, ProgressRing, SectionHeader } from '@/components/ui';
import { BarChart, CalendarHeatmap } from '@/components/charts';
import { dayCounts, volumeSeries, weekStreak } from '@/domain/analytics';
import { generateInsights } from '@/domain/insights';
import { prCountByWorkout, sortNewest, workoutStats } from '@/domain/calc';
import { addDays, cx, DAY, fmtClock, fmtShortMonth, fmtVolume, relativeDay, fmtNum, startOfDay, startOfMonth, startOfWeek, toDisplay } from '@/lib/util';
import { WorkoutCard } from '../history/WorkoutCard';
import { InsightList } from '../analytics/InsightList';
import { generateSampleData } from '@/data/sample';
import { toast } from '@/store/ui';
import '@/styles/dashboard.css';

function greeting(h: number) {
  if (h < 5) return 'Late session';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  useDocumentTitle('Today');
  const workouts = useApp((s) => s.workouts);
  const routines = useApp((s) => s.routines);
  const profile = useApp((s) => s.profile);
  const active = useApp((s) => s.active);
  const startWorkout = useApp((s) => s.startWorkout);
  const navigate = useNavigate();
  const lookup = useExerciseLookup();
  const { events } = useRecords();
  const now = useNow(60_000);
  const unit = profile.unit;

  const sorted = useMemo(() => sortNewest(workouts), [workouts]);
  const weeks = useMemo(() => volumeSeries(workouts, 'week', 12, profile.weekStartsOn, now), [workouts, profile.weekStartsOn, now]);
  const insights = useMemo(() => generateInsights(workouts, lookup, unit, profile.weekStartsOn, now), [workouts, lookup, unit, profile.weekStartsOn, now]);
  const days = useMemo(() => dayCounts(workouts), [workouts]);
  const prMap = useMemo(() => prCountByWorkout(events), [events]);
  const streak = weekStreak(workouts, profile.weekStartsOn, now);
  const volFmt = useMemo(() => (v: number) => fmtVolume(v, unit), [unit]);

  const thisWeek = weeks[weeks.length - 1];
  const lastWeek = weeks[weeks.length - 2];
  // Compare like for like: this week so far vs. last week up to the same moment.
  const lastWeekToDate = useMemo(() => {
    const from = startOfWeek(now, profile.weekStartsOn) - 7 * DAY;
    return workouts.filter((w) => w.startedAt >= from && w.startedAt < now - 7 * DAY).reduce((a, w) => a + workoutStats(w).volume, 0);
  }, [workouts, now, profile.weekStartsOn]);
  const weekDelta = lastWeekToDate > 0 ? Math.round(((thisWeek.value - lastWeekToDate) / lastWeekToDate) * 100) : null;
  const monthStart = startOfMonth(now);
  const monthCount = workouts.filter((w) => w.startedAt >= monthStart).length;
  const monthPRs = events.filter((e) => e.date >= monthStart).length;
  const weekStart = startOfWeek(now, profile.weekStartsOn);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const quick = useMemo(
    () => routines.slice().sort((a, b) => (b.lastUsedAt ?? b.updatedAt) - (a.lastUsedAt ?? a.updatedAt)).slice(0, 6),
    [routines],
  );

  const start = (routineId?: string) => {
    startWorkout(routineId ? { routineId } : undefined);
    navigate('/workout');
  };

  const hour = new Date(now).getHours();
  const empty = workouts.length === 0;

  return (
    <div className="page dash">
      <header className="dash-head">
        <div className="dash-brand-m">
          <Logo size={26} />
        </div>
        <div className="dash-hello">
          <div className="eyebrow">{new Date(now).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
          <h1>
            {greeting(hour)}
            {profile.name ? `, ${profile.name}` : ''}
          </h1>
        </div>
        <div className="dash-head-actions">
          <Link to="/records" className="icon-btn" aria-label="Personal records">
            <Icon name="trophy" />
          </Link>
          <Link to="/settings" className="icon-btn" aria-label="Settings">
            <Icon name="settings" />
          </Link>
        </div>
      </header>

      <div className="dash-grid">
        {/* ---------- Hero ---------- */}
        <Card className="hero">
          <div className="hero-forge" aria-hidden="true" />
          {active ? (
            <ResumeHero />
          ) : (
            <>
              <div className="hero-top">
                <div>
                  <div className="eyebrow">Ready when you are</div>
                  <h2 className="hero-title">Start a session</h2>
                </div>
                <Button variant="primary" size="xl" icon="bolt" onClick={() => start()} className="hero-cta">
                  Empty workout
                </Button>
              </div>
              {quick.length > 0 ? (
                <div className="quick">
                  <div className="row-between">
                    <span className="eyebrow">Quick start · one tap</span>
                    <Link to="/routines" className="link-sm">
                      All routines
                    </Link>
                  </div>
                  <div className="quick-scroll">
                    {quick.map((r, i) => (
                      <motion.button
                        type="button"
                        key={r.id}
                        className="quick-card"
                        onClick={() => start(r.id)}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <span className="quick-name truncate">{r.name}</span>
                        <span className="quick-meta faint">
                          {r.exercises.length} exercises · {r.exercises.reduce((n, e) => n + e.sets.length, 0)} sets
                        </span>
                        <span className="quick-foot">
                          <span className="faint">{r.lastUsedAt ? relativeDay(r.lastUsedAt, now) : 'Not used yet'}</span>
                          <span className="quick-go">
                            <Icon name="play" size={14} strokeWidth={2.4} />
                          </span>
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="quick-empty">
                  <p className="muted">Build a routine once and start it with a single tap every time after.</p>
                  <Button size="sm" icon="plus" onClick={() => navigate('/routines')}>
                    Create a routine
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>

        {/* ---------- Week goal ---------- */}
        <Card className="week">
          <div className="row-between">
            <div>
              <div className="eyebrow">This week</div>
              <div className="week-count">
                <span className="num">{thisWeek.count}</span>
                <span className="faint">/ {profile.weeklyGoal} sessions</span>
              </div>
            </div>
            <ProgressRing value={thisWeek.count / profile.weeklyGoal} size={68} stroke={6}>
              <Icon name={thisWeek.count >= profile.weeklyGoal ? 'check' : 'flame'} size={22} style={{ color: 'var(--ember)' }} />
            </ProgressRing>
          </div>
          <div className="week-strip">
            {weekDays.map((d) => {
              const n = days.get(d) ?? 0;
              const isToday = d === startOfDay(now);
              return (
                <div key={d} className={cx('wday', n > 0 && 'wday-on', isToday && 'wday-today', d > now && 'wday-future')}>
                  <span className="wday-l">{new Date(d).toLocaleDateString(undefined, { weekday: 'narrow' })}</span>
                  <span className="wday-dot">{n > 0 && <Icon name="check" size={13} strokeWidth={3} />}</span>
                </div>
              );
            })}
          </div>
          <div className="week-foot">
            <span>
              <Icon name="flame" size={15} /> <strong className="num">{streak}</strong> week streak
            </span>
            <span className="num">
              {fmtVolume(thisWeek.value, unit)} {unit}
            </span>
          </div>
        </Card>

        {empty ? (
          <Card className="span-all">
            <EmptyState
              icon="sparkle"
              title="Your training log starts here"
              body="Log your first session and ForgeTrack will start charting volume, strength and records automatically. Want to look around first? Load a realistic 14-week sample log."
              action={
                <>
                  <Button variant="primary" icon="bolt" onClick={() => start()}>
                    Start first workout
                  </Button>
                  <Button
                    icon="sparkle"
                    onClick={() => {
                      useApp.getState().replaceAll(generateSampleData());
                      toast({ message: 'Sample data loaded — clear it any time in Settings.', tone: 'success' });
                    }}
                  >
                    Load sample data
                  </Button>
                </>
              }
            />
          </Card>
        ) : (
          <>
            {/* ---------- KPIs ---------- */}
            <div className="kpis span-all">
              <Kpi
                label="Week volume"
                value={<NumberTicker value={thisWeek.value} format={volFmt} />}
                unit={unit}
                delta={weekDelta}
                sub={`Last week ${fmtVolume(lastWeek.value, unit)} ${unit}`}
              />
              <Kpi label={`${fmtShortMonth(now)} sessions`} value={<NumberTicker value={monthCount} />} sub={`${workouts.length} all-time`} />
              <Kpi label="Streak" value={<NumberTicker value={streak} />} unit="wks" sub="≥1 session / week" />
              <Kpi label="PRs this month" value={<NumberTicker value={monthPRs} />} sub={`${events.length} all-time`} gold />
            </div>

            <Card className="insights-card">
              <SectionHeader eyebrow="Progress signals" title="Insights" action={<Link to="/analytics" className="link-sm">Analytics</Link>} />
              <InsightList insights={insights.slice(0, 4)} />
            </Card>

            <Card className="vol-card">
              <SectionHeader
                eyebrow="Last 12 weeks"
                title="Training volume"
                action={
                  <span className="faint num" style={{ fontSize: 13 }}>
                    avg {fmtVolume(weeks.reduce((a, w) => a + w.value, 0) / weeks.length, unit)} {unit}/wk
                  </span>
                }
              />
              <BarChart
                height={220}
                format={fmtNum}
                data={weeks.map((w, i) => ({
                  key: w.t,
                  label: i === weeks.length - 1 ? 'Now' : new Date(w.t).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }),
                  value: toDisplay(w.value, unit),
                  sub: `${w.count} session${w.count === 1 ? '' : 's'}`,
                  highlight: i === weeks.length - 1,
                }))}
              />
            </Card>

            <Card className="cal-card">
              <SectionHeader eyebrow="Consistency" title="Training calendar" action={<span className="faint" style={{ fontSize: 13 }}>{workouts.filter((w) => w.startedAt > now - 140 * DAY).length} sessions / 20 wks</span>} />
              <CalendarHeatmap days={days} weeks={20} weekStartsOn={profile.weekStartsOn} now={now} />
            </Card>

            <Card className="recent-card">
              <SectionHeader eyebrow="Latest" title="Recent sessions" action={<Link to="/history" className="link-sm">History</Link>} />
              <div className="stack" style={{ gap: 8 }}>
                {sorted.slice(0, 4).map((w) => (
                  <WorkoutCard key={w.id} workout={w} prs={prMap.get(w.id)} compact />
                ))}
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, unit, sub, delta, gold }: { label: string; value: React.ReactNode; unit?: string; sub?: string; delta?: number | null; gold?: boolean }) {
  return (
    <div className={cx('kpi', gold && 'kpi-gold')}>
      <div className="eyebrow">{label}</div>
      <div className="kpi-value">
        {value}
        {unit && <span className="kpi-unit">{unit}</span>}
      </div>
      {delta != null && (
        <div className={cx('kpi-delta', delta >= 0 ? 'up' : 'down')} title="Compared with last week up to the same day and time">
          <Icon name={delta >= 0 ? 'arrowUp' : 'arrowDown'} size={13} strokeWidth={2.4} />
          {Math.abs(delta)}% vs last week to date
        </div>
      )}
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

function ResumeHero() {
  const active = useApp((s) => s.active)!;
  const navigate = useNavigate();
  const now = useNow(1000);
  const st = workoutStats(active, now);
  const total = active.exercises.reduce((n, e) => n + e.sets.length, 0);
  const done = active.exercises.reduce((n, e) => n + e.sets.filter((s) => s.completed).length, 0);
  return (
    <div className="resume">
      <div>
        <div className="row" style={{ gap: 8 }}>
          <span className="live-dot" />
          <span className="eyebrow" style={{ color: 'var(--ember)' }}>
            In progress
          </span>
        </div>
        <h2 className="hero-title">{active.name}</h2>
        <div className="resume-stats">
          <span className="num resume-clock">{fmtClock(st.durationMs / 1000)}</span>
          <span className="faint">
            {done}/{total} sets · {active.exercises.length} exercises
          </span>
        </div>
      </div>
      <Button variant="primary" size="xl" icon="play" onClick={() => navigate('/workout')} className="hero-cta">
        Resume
      </Button>
    </div>
  );
}
