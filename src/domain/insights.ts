import type { Unit } from './types';
import type { Workout } from './types';
import { computeRecords, PR_SHORT, workoutStats } from './calc';
import { exerciseFrequency, exerciseSessions, volumeSeries, weekStreak, type ExerciseLookup } from './analytics';
import { DAY, fmtWeight } from '@/lib/util';

export type InsightTone = 'up' | 'down' | 'record' | 'neutral';
export interface Insight {
  id: string;
  tone: InsightTone;
  title: string;
  detail?: string;
  exerciseId?: string;
  /** Higher = shown first. */
  weight: number;
}

const pct = (a: number, b: number) => Math.round(((a - b) / b) * 100);

/**
 * Descriptive, non-prescriptive statements about the user's own training data.
 * Never medical advice — wording reports what happened, not what to do with your body.
 */
export function generateInsights(
  workouts: Workout[],
  lookup: ExerciseLookup,
  unit: Unit,
  weekStartsOn: 0 | 1 = 1,
  now = Date.now(),
): Insight[] {
  const out: Insight[] = [];
  if (workouts.length === 0) return out;

  // Weekly volume: this week so far vs. last full week, and multi-week declines.
  const weeks = volumeSeries(workouts, 'week', 6, weekStartsOn, now);
  const [thisW, lastW] = [weeks[5], weeks[4]];
  if (thisW.value > 0 && lastW.value > 0) {
    const d = pct(thisW.value, lastW.value);
    if (d >= 5)
      out.push({
        id: 'vol-week-up',
        tone: 'up',
        title: `You've already moved ${d}% more volume than last week.`,
        detail: `${thisW.count} session${thisW.count === 1 ? '' : 's'} so far this week.`,
        weight: 60,
      });
  }
  // Four complete weeks before this one, oldest → newest; full[3] is last week.
  const full = weeks.slice(1, 5).map((w) => w.value);
  if (full[3] > 0 && full[3] < full[2] && full[2] < full[1]) {
    const declineWeeks = full[1] < full[0] ? 3 : 2;
    out.push({
      id: 'vol-decline',
      tone: 'down',
      title: `Your weekly volume has decreased for ${declineWeeks} weeks in a row.`,
      detail: `Last week: ${pct(full[3], full[1])}% vs. three weeks ago.`,
      weight: 40,
    });
  } else if (full[3] > 0 && full[2] > 0) {
    const d = pct(full[3], full[2]);
    if (Math.abs(d) >= 8)
      out.push({
        id: 'vol-lastweek',
        tone: d > 0 ? 'up' : 'down',
        title: `Last week's training volume was ${Math.abs(d)}% ${d > 0 ? 'higher' : 'lower'} than the week before.`,
        weight: 30,
      });
  }

  // Recent PRs (last 7 days).
  const { events } = computeRecords(workouts);
  const recent = events.filter((e) => now - e.date < 7 * DAY);
  if (recent.length) {
    const byEx = new Map<string, typeof recent>();
    for (const e of recent) byEx.set(e.exerciseId, [...(byEx.get(e.exerciseId) ?? []), e]);
    const [topId, topEvents] = [...byEx.entries()].sort((a, b) => b[1].length - a[1].length)[0];
    const name = lookup(topId)?.name ?? 'an exercise';
    const kinds = [...new Set(topEvents.map((e) => PR_SHORT[e.kind]))].join(', ');
    out.push({
      id: 'pr-recent',
      tone: 'record',
      title: `New personal record${recent.length > 1 ? 's' : ''} this week — ${recent.length} in total.`,
      detail: `${name}: ${kinds}.`,
      exerciseId: topId,
      weight: 90,
    });
  }

  // Strength progression on top exercises: best e1RM in last 30d vs. the 30d before that.
  const top = exerciseFrequency(workouts).slice(0, 6);
  for (const { exerciseId } of top) {
    const ex = lookup(exerciseId);
    if (!ex || ex.tracking !== 'weight_reps') continue;
    const sessions = exerciseSessions(workouts, exerciseId);
    const bestIn = (from: number, to: number) =>
      sessions.filter((s) => s.date >= from && s.date < to).reduce((m, s) => Math.max(m, s.topWeight), 0);
    const cur = bestIn(now - 30 * DAY, now + 1);
    const prev = bestIn(now - 60 * DAY, now - 30 * DAY);
    if (cur > 0 && prev > 0 && Math.abs(cur - prev) >= 0.5) {
      const diff = cur - prev;
      out.push({
        id: `str-${exerciseId}`,
        tone: diff > 0 ? 'up' : 'down',
        title:
          diff > 0
            ? `You increased ${ex.name} by ${fmtWeight(diff, unit)} ${unit} compared with last month.`
            : `${ex.name} top weight is ${fmtWeight(-diff, unit)} ${unit} below last month.`,
        detail: `Top set ${fmtWeight(cur, unit)} ${unit} vs ${fmtWeight(prev, unit)} ${unit}.`,
        exerciseId,
        weight: diff > 0 ? 70 : 20,
      });
    }
  }

  // Consistency.
  const streak = weekStreak(workouts, weekStartsOn, now);
  if (streak >= 3)
    out.push({
      id: 'streak',
      tone: 'up',
      title: `${streak}-week training streak.`,
      detail: 'At least one session logged every week.',
      weight: 50,
    });

  const last = workouts.reduce((m, w) => Math.max(m, w.startedAt), 0);
  const gap = Math.floor((now - last) / DAY);
  if (gap >= 7)
    out.push({
      id: 'gap',
      tone: 'neutral',
      title: `It's been ${gap} days since your last logged session.`,
      weight: 45,
    });

  // Last session summary when nothing else is interesting.
  if (out.length === 0) {
    const lastW = workouts.reduce((a, b) => (a.startedAt > b.startedAt ? a : b));
    const st = workoutStats(lastW);
    out.push({
      id: 'last',
      tone: 'neutral',
      title: `Last session: ${st.sets} working sets across ${st.exercises} exercises.`,
      weight: 1,
    });
  }

  return out.sort((a, b) => b.weight - a.weight);
}
