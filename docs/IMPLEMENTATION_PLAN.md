# ForgeTrack — Implementation Plan

| Phase | Deliverable | Done when |
|---|---|---|
| A | Research + spec + architecture + this plan | Docs in `/docs` |
| B | Domain types, zod schemas, calculations, exercise library, persisted store, sample-data generator | Unit tests pass |
| C | App shell (rail + bottom nav), dashboard, active workout logging, exercise selector, rest timer | Can log a full session on mobile & desktop |
| D | Routines (builder, reorder, duplicate), history (detail, edit, duplicate, delete), personal records | Round trip routine → workout → history → records |
| E | Analytics charts, calendar heatmap, muscle distribution, bodyweight, insights engine | Calculations covered by tests |
| F | Motion polish, PR celebration, reduced-motion, a11y labels, keyboard shortcuts, PWA manifest, responsive QA at 360/390/768/1280/1680 | Lint + typecheck + tests + build clean |

## Status (v1.0)

All phases A–F are implemented. Verified: unit tests (19), `tsc` strict, ESLint, production build; manual browser QA of the routine → log → PR → finish → history loop, rest timer persistence across reload, picker search/multi-select, bodyweight logging, history edit/delete/undo, light/dark themes, and no horizontal overflow on every route at 360 px; layouts checked at 360, 375, 800 and 1440 px.

Deferred (see README / final summary): cloud sync & multi-device, plate calculator & warm-up generator, programs with auto-progression, RPE/RIR, wearables, health-platform export, e2e test suite.

Decisions taken autonomously:
- Greenfield Vite SPA (repo was empty) instead of a server framework — self-hosting is a static folder.
- No authentication: single-user local-first app; "User" is a local profile. Multi-user sync deferred.
- Hand-rolled SVG charts for originality and bundle size.
- Supersets modeled as exercise links, not a per-set type.
