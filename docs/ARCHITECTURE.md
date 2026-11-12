# ForgeTrack — Architecture

## Stack
| Concern | Choice | Why |
|---|---|---|
| Build | Vite 5 + TypeScript (strict) | Fast dev loop, small static output, trivially self-hostable |
| UI | React 18 | Mature, ecosystem for motion and drag |
| Routing | react-router-dom 6 | Route-level code splitting via `lazy` |
| State | Zustand 5 | Tiny, selector-based subscriptions → minimal re-renders |
| Persistence | IndexedDB via `idb-keyval` + Zustand `persist` | Local-first, offline, survives reloads, no server |
| Validation | Zod | Validates imports/backups and persisted state on hydrate |
| Motion | framer-motion | Layout animations, `Reorder` drag-and-drop, `AnimatePresence`; respects reduced motion |
| Charts | Hand-built SVG components | Original visuals, ~0 KB library cost, full control of animation |
| Styling | CSS custom properties + one design-token stylesheet | Themeable (dark-first + light), no runtime CSS-in-JS |
| Tests | Vitest | Pure-function tests for calculations, records, insights, store flows |
| iOS shell | Capacitor 8 (Swift Package Manager) | Wraps the unchanged web build as a native iPhone app; plugins for haptics, local notifications, status bar, keep-awake, filesystem, share |

## Layers (clean architecture)
```
src/
  domain/        pure TS: types, zod schemas, calculations (volume, e1RM), records, insights, analytics
  data/          exercise library seed, sample-data generator
  store/         zustand stores: app data (persisted), active workout actions, rest timer, UI/toasts
  lib/           units, formatting, ids, dates, haptics/sound, native.ts (the only platform bridge)
  components/    design-system primitives (Button, Sheet, Icon, NumberTicker, charts …)
  features/      screen-level modules: dashboard, workout, exercises, routines, history, analytics, records, settings
  app/           shell: layout, navigation, router
```
`domain` has no React imports and is fully unit-tested. Screens read via selectors and call store actions; they never mutate data directly.

## Data model
```ts
UserProfile   { name, unit: 'kg'|'lb', defaultRestSec, theme, sound, haptics, weekStartsOn }
Exercise      { id, name, primaryMuscle, secondaryMuscles[], equipment, category, tracking, instructions[], isCustom, defaultRestSec? }
Routine       { id, name, notes, exercises: RoutineExercise[], createdAt, updatedAt, lastUsedAt? }
RoutineExercise { id, exerciseId, restSec?, notes, supersetId?, sets: TemplateSet[] }
TemplateSet   { id, type, weight?, reps?, durationSec? }
Workout       { id, name, routineId?, startedAt, endedAt?, notes, exercises: WorkoutExercise[] }
WorkoutExercise { id, exerciseId, restSec?, notes, supersetId?, sets: WorkoutSet[] }
WorkoutSet    { id, type: 'warmup'|'normal'|'failure'|'drop', weight?, reps?, durationSec?, completed, completedAt? }
PersonalRecord { exerciseId, kind: 'weight'|'e1rm'|'volume'|'reps', value, weight, reps, workoutId, date }   // derived
BodyweightEntry { id, date, weight }
```
- **Supersets** are modeled as a shared `supersetId` linking consecutive exercises (a set-level "superset" type does not carry meaning on its own). Linked exercises render with a connecting rail and the rest timer is deferred until the last exercise of the round.
- **PersonalRecord** is *derived*, not stored: a memoized pass over completed workouts. This removes a whole class of sync bugs when history is edited.
- The **active workout** is persisted alongside history, so a reload or crash resumes the session. The **rest timer** stores an absolute `endsAt` timestamp, so it is correct after the tab was backgrounded.

## Persistence
Single versioned document `forgetrack:v1` in IndexedDB. `persist` handles migrations via `version` + `migrate`. Backup = the same document as JSON, validated with Zod on import. For thousands of workouts this remains well under a few MB.

## Platforms
One codebase, two targets. `src/lib/native.ts` is the single place that knows whether it runs in a browser or the iOS app (`Capacitor.isNativePlatform()`); features call its functions and never branch on platform. On iOS:
- the service worker is not registered (assets are bundled);
- rest-end alerts are local notifications scheduled at the timer's absolute `endsAt` (`PlatformSync` in `Shell.tsx`), so they fire with the phone locked; foreground presentation is suppressed because the app plays its own chime/haptic;
- the persisted document is mirrored (debounced) to `Documents/forgetrack-data.json`; if IndexedDB is empty on launch, the store hydrates from that mirror.
`ios/` is a generated-then-committed Xcode project; `ios/App/App/public` (the copied web build) is git-ignored and recreated by `npm run ios:sync`.

## Performance
- Route-level lazy loading; charts and analytics are separate chunks.
- Expensive derivations (`records`, `exerciseHistory`, analytics series) memoized on the `workouts` array identity.
- Set rows subscribe to their own set via selectors so typing in one row doesn't re-render the workout.
- Animations limited to `transform`/`opacity`; `MotionConfig reducedMotion="user"`.
