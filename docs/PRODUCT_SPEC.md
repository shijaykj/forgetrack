# ForgeTrack — Product Spec

## Positioning
A premium, self-hosted strength-training logger. No accounts, no limits, no paywalls. Data lives on the device (IndexedDB) and can be exported at any time.

Brand: premium · minimal · athletic · data-driven · extremely fast. Visual direction: "performance technology" — graphite surfaces, molten-ember accent (the forge), precise mono-spaced numerals, thin technical rules and tick marks.

## Starting state
The repository was empty at project start (no framework, no components, no database, no auth). ForgeTrack is therefore greenfield.

## Speed budget
- Open app → logging first set of a routine: **2 taps** (routine quick-start → ✓).
- Log a set that repeats last session: **1 tap**.
- Any screen → start empty workout: **1 tap**.

## Screens
1. **Dashboard** — greeting, active-workout resume card, start CTA, routine quick-starts, this-week stats, insights, training calendar, recent sessions.
2. **Start Workout** — empty workout or pick routine (sheet/route).
3. **Active Workout** — exercise cards with set tables, docked rest timer, elapsed clock, progress, finish. Desktop adds a side panel with live stats.
4. **Exercise Selector** — searchable, filterable, multi-select overlay; create custom exercise inline.
5. **Routine Builder** — name, notes, reorderable exercises, planned sets per exercise with targets, rest per exercise.
6. **Workout History** — monthly feed; detail with edit, duplicate (start again), save as routine, delete.
7. **Analytics** — KPI strip, volume over time (week/month), strength progression per exercise (e1RM), calendar heatmap, muscle distribution, bodyweight.
8. **Personal Records** — per-exercise records with dates; recent PR timeline.
9. **Settings** — profile name, units, default rest, theme, sounds/haptics, data export/import, sample data, reset.
Additional: **Exercise library & detail** pages.

## Rules
- Volume = Σ weight × reps over completed, non-warm-up sets.
- e1RM = Epley `w × (1 + r/30)`, `r = 1 → w`; only reps ≤ 12 counted for e1RM records (accuracy degrades).
- Records are derived from completed workouts, so editing/deleting history keeps them correct.
- Weights are stored in kg; UI converts to the user's unit.
- Insights are descriptive statements about the user's own data only — never medical or prescriptive advice.
