# ForgeTrack — Product Research

> Scope: publicly observable information only (App Store listings, vendor marketing pages, public reviews, general knowledge of how strength-logging apps behave). No private APIs, source code, paid content or assets were accessed. Nothing here describes another product's exact UI; it extracts general usability principles that ForgeTrack then implements in its own way.

## 0. Landscape note

"Heavy" is ambiguous in public listings — the App Store contains several lifting apps with "Heavy" in their name (e.g. *Heavy Data Gym Workout Tracker*, *HeavySet*, *HeavyLifting*), and the best-known similar-sounding app is *Hevy*. Rather than model any single one, this research treats the category of modern strength loggers (Hevy-, Strong-, Liiift-, Jefit-, Alpha Progression-style) as the reference set.

Sources reviewed (public pages):
- App Store listing: Heavy Data Gym Workout Tracker — charts/graphs, %RM warm-up calculator, barbell loading helper.
- App Store listing: Liiift — set logging, plans, session review, auto-start rest timer, lock-screen timer, strong accessibility list (VoiceOver, Larger Text, Differentiate Without Color).
- hevyapp.com "best workout tracker app" — free auto rest timer, "Previous" column while logging.
- repreturn.com Strong review — auto-start countdown after a logged set, pre-loaded previous weights; widely called the fastest logger.
- alphaprogression.com — previous performance, current targets, completed sets and rest timer should remain visible during a workout.
- jefit.com smartwatch roundup — previous performance per exercise and custom rest intervals as table-stakes.

**Consistent signal across sources:** (1) the rest timer starts automatically when a set is logged, (2) last session's numbers are visible on the logging row, (3) logging must take one tap when you repeat last time's numbers.

## 1. Core user journeys

| Journey | Observed category pattern | ForgeTrack principle |
|---|---|---|
| Start a workout | One prominent "start" entry point; routines listed as quick starts | Start is reachable in **1 tap** from every screen (center nav action). Routine quick-starts live on the dashboard. |
| Select / create routine | Routine list → preview → start; routines built from exercise picker | Starting a routine is **1 tap** from the dashboard (no preview step). Building is inline — no multi-page wizard. |
| Add exercises | Searchable list with muscle filters, multi-select | Full-screen picker with instant search, muscle chips, recent exercises first, **multi-select** then add all. |
| Log sets | Table rows: set #, previous, weight, reps, check | Row prefilled with previous values (ghost text). Tapping ✓ commits ghost values. |
| Record weight & reps | Numeric fields, keyboard | `inputmode="decimal"`, select-on-focus, ± steppers in the focused row, tap "previous" to copy. |
| Rest timer | Auto-start after set; +/- controls; skip | Auto-starts with per-exercise duration; timestamp-based so it survives backgrounding; +30 s / pause / skip in a docked bar. |
| Complete workout | Finish → summary screen | Finish → celebratory summary (duration, volume, sets, PRs), "save as routine" offered here. Empty sets discarded automatically. |
| Review history | Reverse-chronological feed of sessions | Feed grouped by month with volume, duration, PR badges; detail view allows edit/duplicate/delete. |
| Track progressive overload | Per-exercise charts, PR lists, e1RM | Per-exercise page: e1RM trend, best sets, records. Insights engine surfaces changes in plain language. |

## 2. UX patterns

- **One-hand gym usage** — primary actions live in the bottom third of the screen on mobile (thumb zone): set check buttons are right-aligned, the rest timer and Finish are docked at the bottom.
- **Large tap targets** — minimum 44×44 px; set-row controls are 48 px tall; check button is the largest element in the row.
- **Minimal typing** — previous values prefill as placeholders; ✓ uses them. Steppers adjust by the plate increment (2.5 kg / 5 lb) and reps by 1.
- **Fast set logging** — complete → auto rest → next set's weight field becomes the focus target; haptic tick where supported.
- **Automatic next-set behavior** — the next incomplete set inherits the weight/reps just logged if it was empty.
- **Rest timer interactions** — visible countdown ring, ±30 s, pause, skip; vibration + soft tone at zero; never blocks input.
- **Previous performance visibility** — "Previous" column per set index from the last session that contained the exercise; PR badge appears inline the moment a logged set beats a record.
- **Undo over confirm** — destructive actions in-session (remove set/exercise) are instant with an undo toast instead of a confirmation modal. Only whole-workout discard and deleting saved history ask once.
- **Progressive disclosure** — notes, set types, rest overrides and superset links are tucked behind a per-exercise menu.

## 3. Feature comparison

### Essential MVP
Workout logging (weight/reps, bodyweight, duration), set types (warm-up, normal, failure, drop), previous performance, auto rest timer, exercise library + custom exercises, routines (create/edit/duplicate/reorder), history (view/edit/duplicate/delete), local persistence, kg/lb units.

### Premium experience
Supersets, inline PR badges + celebration, per-exercise rest overrides, drag-to-reorder, undo toasts, keyboard shortcuts on desktop, workout summary screen, save-workout-as-routine, light/dark themes, offline install (PWA), JSON backup/restore — all **unlimited**, no paywalls.

### Advanced analytics
Estimated 1RM (Epley), strength progression charts, weekly/monthly volume, muscle-group distribution (sets & volume, secondary muscles weighted 0.5), training calendar heatmap, PR tables (heaviest weight, best e1RM, best set volume, most reps), bodyweight trend, natural-language progress insights.

### Future features
Cloud sync / multi-device, wearable companion, plate calculator & warm-up generator, programs with auto-progression, RPE/RIR targets, social sharing, health-platform integrations.
