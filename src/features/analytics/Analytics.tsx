import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/store/app';
import { useDocumentTitle, useExerciseLookup, useRecords } from '@/lib/hooks';
import { dayCounts, exerciseFrequency, exerciseSessions, muscleDistribution, volumeSeries } from '@/domain/analytics';
import { generateInsights } from '@/domain/insights';
import { workoutStats } from '@/domain/calc';
import { MUSCLE_LABEL } from '@/data/exercises';
import { BarChart, CalendarHeatmap, LineChart, RadarChart, ShareBars } from '@/components/charts';
import { Button, Card, Chip, EmptyState, NumberTicker, SectionHeader, Segmented } from '@/components/ui';
import { DAY, fmtDuration, fmtNum, fmtShortMonth, fmtVolume, fmtWeight, toDisplay } from '@/lib/util';
import { InsightList } from './InsightList';
import { BodyweightCard } from './BodyweightCard';
import '@/styles/dashboard.css';
import '@/styles/pages.css';

type Range = '4w' | '12w' | '6m' | '1y' | 'all';
const RANGE_DAYS: Record<Range, number> = { '4w': 28, '12w': 84, '6m': 182, '1y': 365, all: 100_000 };
type Metric = 'e1rm' | 'top' | 'volume';

export default function Analytics() {
  useDocumentTitle('Progress');
  const workouts = useApp((s) => s.workouts);
  const profile = useApp((s) => s.profile);
  const unit = profile.unit;
  const lookup = useExerciseLookup();
  const { events } = useRecords();
  const navigate = useNavigate();
  const [range, setRange] = useState<Range>('12w');
  const [bucket, setBucket] = useState<'week' | 'month'>('week');
  const [metric, setMetric] = useState<Metric>('e1rm');
  const [now] = useState(() => Date.now());

  const since = now - RANGE_DAYS[range] * DAY;
  const inRange = useMemo(() => workouts.filter((w) => w.startedAt >= since), [workouts, since]);
  const totals = useMemo(() => {
    const st = inRange.map((w) => workoutStats(w));
    return {
      volume: st.reduce((a, s) => a + s.volume, 0),
      sets: st.reduce((a, s) => a + s.sets, 0),
      time: st.reduce((a, s) => a + s.durationMs, 0),
    };
  }, [inRange]);
  const weeksInRange = Math.max(1, Math.min(RANGE_DAYS[range], workouts.length ? (now - Math.min(...workouts.map((w) => w.startedAt))) / DAY : 1) / 7);

  const series = useMemo(() => {
    const n = bucket === 'week' ? Math.min(52, Math.ceil(RANGE_DAYS[range] / 7)) : Math.min(24, Math.max(3, Math.ceil(RANGE_DAYS[range] / 30)));
    const cap = range === 'all' ? (bucket === 'week' ? 26 : 12) : n;
    return volumeSeries(workouts, bucket, cap, profile.weekStartsOn, now);
  }, [workouts, bucket, range, profile.weekStartsOn, now]);

  const top = useMemo(() => exerciseFrequency(workouts).filter((f) => lookup(f.exerciseId)?.tracking !== 'duration').slice(0, 8), [workouts, lookup]);
  const [exId, setExId] = useState<string | null>(null);
  const selectedEx = exId ?? top[0]?.exerciseId ?? null;
  const sessions = useMemo(() => (selectedEx ? exerciseSessions(workouts, selectedEx).filter((s) => s.date >= since) : []), [workouts, selectedEx, since]);
  const prDates = useMemo(() => new Set(events.filter((e) => e.exerciseId === selectedEx && e.kind === (metric === 'top' ? 'weight' : metric === 'volume' ? 'volume' : 'e1rm')).map((e) => e.workoutId)), [events, selectedEx, metric]);
  const strength = sessions.map((s) => ({
    t: s.date,
    value: toDisplay(metric === 'e1rm' ? s.bestE1RM : metric === 'top' ? s.topWeight : s.volume, unit),
    marker: prDates.has(s.workoutId),
  })).filter((p) => p.value > 0);
  const delta = strength.length > 1 ? strength[strength.length - 1].value - strength[0].value : 0;

  const muscles = useMemo(() => muscleDistribution(workouts, lookup, since), [workouts, lookup, since]);
  const days = useMemo(() => dayCounts(workouts), [workouts]);
  const insights = useMemo(() => generateInsights(workouts, lookup, unit, profile.weekStartsOn, now), [workouts, lookup, unit, profile.weekStartsOn, now]);

  if (workouts.length === 0) {
    return (
      <div className="page">
        <div className="page-head">
          <div>
            <div className="eyebrow">Analytics</div>
            <h1>Progress</h1>
          </div>
        </div>
        <Card>
          <EmptyState icon="chart" title="Charts unlock as you train" body="Volume trends, estimated 1RM progression, muscle balance and your training calendar appear after your first logged session." action={<Button variant="primary" icon="bolt" onClick={() => navigate('/start')}>Start a workout</Button>} />
        </Card>
        <div style={{ marginTop: 18 }}>
          <BodyweightCard />
        </div>
      </div>
    );
  }

  const volFmt = (v: number) => fmtVolume(v, unit);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Analytics</div>
          <h1>Progress</h1>
        </div>
        <Segmented
          label="Date range"
          value={range}
          onChange={setRange}
          options={[
            { value: '4w', label: '4W' },
            { value: '12w', label: '12W' },
            { value: '6m', label: '6M' },
            { value: '1y', label: '1Y' },
            { value: 'all', label: 'All' },
          ]}
        />
      </div>

      <div className="kpis" style={{ marginBottom: 18 }}>
        <div className="kpi">
          <div className="eyebrow">Workouts</div>
          <div className="kpi-value">
            <NumberTicker value={inRange.length} />
          </div>
          <div className="kpi-sub">{(inRange.length / weeksInRange).toFixed(1)} per week</div>
        </div>
        <div className="kpi">
          <div className="eyebrow">Total volume</div>
          <div className="kpi-value">
            <NumberTicker value={totals.volume} format={volFmt} />
            <span className="kpi-unit">{unit}</span>
          </div>
          <div className="kpi-sub">{volFmt(totals.volume / Math.max(1, inRange.length))} per session</div>
        </div>
        <div className="kpi">
          <div className="eyebrow">Working sets</div>
          <div className="kpi-value">
            <NumberTicker value={totals.sets} />
          </div>
          <div className="kpi-sub">{Math.round(totals.sets / Math.max(1, inRange.length))} per session</div>
        </div>
        <div className="kpi">
          <div className="eyebrow">Time under the bar</div>
          <div className="kpi-value" style={{ fontSize: 'clamp(22px, 3vw, 30px)' }}>
            {fmtDuration(totals.time)}
          </div>
          <div className="kpi-sub">{fmtDuration(totals.time / Math.max(1, inRange.length))} avg session</div>
        </div>
      </div>

      <div className="an-grid">
        <Card className="an-wide">
          <SectionHeader
            eyebrow={bucket === 'week' ? 'Weekly' : 'Monthly'}
            title="Training volume"
            action={
              <Segmented
                size="sm"
                label="Volume bucket"
                value={bucket}
                onChange={setBucket}
                options={[
                  { value: 'week', label: 'Week' },
                  { value: 'month', label: 'Month' },
                ]}
              />
            }
          />
          <BarChart
            height={240}
            data={series.map((p, i) => ({
              key: p.t,
              label: bucket === 'week' ? new Date(p.t).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }) : fmtShortMonth(p.t),
              value: toDisplay(p.value, unit),
              sub: `${p.count} session${p.count === 1 ? '' : 's'}`,
              highlight: i === series.length - 1,
            }))}
            format={fmtNum}
          />
        </Card>

        <Card className="an-wide">
          <SectionHeader
            eyebrow="Strength progression"
            title={selectedEx ? lookup(selectedEx)?.name ?? 'Exercise' : 'Exercise'}
            action={
              <Segmented
                size="sm"
                label="Metric"
                value={metric}
                onChange={setMetric}
                options={[
                  { value: 'e1rm', label: 'e1RM' },
                  { value: 'top', label: 'Top set' },
                  { value: 'volume', label: 'Volume' },
                ]}
              />
            }
          />
          <div className="chip-scroll" role="group" aria-label="Choose exercise">
            {top.map((f) => (
              <Chip key={f.exerciseId} active={f.exerciseId === selectedEx} onClick={() => setExId(f.exerciseId)}>
                {lookup(f.exerciseId)?.name}
              </Chip>
            ))}
          </div>
          <div className="an-strength-head">
            {strength.length > 0 && (
              <>
                <span className="num an-big">
                  {metric === 'volume' ? fmtNum(strength[strength.length - 1].value) : Math.round(strength[strength.length - 1].value * 10) / 10}
                  <small> {unit}</small>
                </span>
                {strength.length > 1 && (
                  <span className={delta >= 0 ? 'kpi-delta up' : 'kpi-delta down'}>
                    {delta >= 0 ? '+' : '−'}
                    {metric === 'volume' ? fmtNum(Math.abs(delta)) : Math.abs(Math.round(delta * 10) / 10)} {unit} in range
                  </span>
                )}
                <span className="faint an-legend">
                  <i className="an-diamond" /> new record
                </span>
              </>
            )}
          </div>
          <LineChart data={strength} height={240} format={(v) => (metric === 'volume' ? fmtNum(v) : String(Math.round(v)))} />
          {selectedEx && (
            <button type="button" className="link-sm" style={{ marginTop: 10, display: 'inline-block' }} onClick={() => navigate(`/exercises/${selectedEx}`)}>
              Full exercise history →
            </button>
          )}
        </Card>

        <Card className="an-half">
          <SectionHeader eyebrow="Balance" title="Muscle distribution" action={<span className="faint" style={{ fontSize: 12.5 }}>sets · secondary = ½</span>} />
          <RadarChart axes={muscles.slice().sort((a, b) => a.muscle.localeCompare(b.muscle)).map((m) => ({ label: MUSCLE_LABEL[m.muscle], value: m.sets }))} size={300} />
        </Card>
        <Card className="an-half">
          <SectionHeader eyebrow="Where the work went" title="Volume by muscle" />
          <ShareBars
            rows={muscles.filter((m) => m.sets > 0).slice(0, 8).map((m) => ({ label: MUSCLE_LABEL[m.muscle], value: m.sets, sub: `· ${fmtVolume(m.volume, unit)} ${unit}` }))}
            format={(v) => `${Math.round(v * 10) / 10} sets`}
          />
        </Card>

        <Card className="an-wide">
          <SectionHeader eyebrow="Frequency" title="Training calendar" action={<span className="faint num" style={{ fontSize: 13 }}>{workouts.filter((w) => w.startedAt >= now - 364 * DAY).length} sessions in 52 weeks</span>} />
          <CalendarHeatmap days={days} weeks={52} weekStartsOn={profile.weekStartsOn} now={now} />
        </Card>

        <Card className="an-half">
          <SectionHeader eyebrow="Progress signals" title="Insights" />
          <InsightList insights={insights} />
          <p className="faint an-disclaimer">Insights describe your logged data only. They aren't medical or training advice.</p>
        </Card>
        <div className="an-half">
          <BodyweightCard />
        </div>

        <Card className="an-wide">
          <SectionHeader eyebrow="Most trained" title="Exercise leaderboard" />
          <div className="leader">
            {exerciseFrequency(inRange)
              .slice(0, 8)
              .map((f, i) => {
                const ex = lookup(f.exerciseId);
                const sess = exerciseSessions(workouts, f.exerciseId);
                const best = sess.reduce((m, s) => Math.max(m, s.bestE1RM), 0);
                return (
                  <button key={f.exerciseId} type="button" className="leader-row" onClick={() => navigate(`/exercises/${f.exerciseId}`)}>
                    <span className="num faint">{String(i + 1).padStart(2, '0')}</span>
                    <span className="truncate leader-name">{ex?.name}</span>
                    <span className="faint leader-meta">{f.sessions} sessions</span>
                    <span className="num leader-val">{best ? `${fmtWeight(best, unit)} ${unit}` : '—'}</span>
                  </button>
                );
              })}
          </div>
          <p className="faint" style={{ fontSize: 12, marginTop: 8 }}>
            Right column: best estimated 1RM (Epley, sets of 12 reps or fewer).
          </p>
        </Card>
      </div>
    </div>
  );
}
