# ForgeTrack

A premium, local-first strength-training tracker. Fast set logging, smart rest timer, routines, records and analytics — no account, no paywalls, no limits. Self-host it as a static site.

![stack](https://img.shields.io/badge/React-18-ff5b1f) ![stack](https://img.shields.io/badge/TypeScript-strict-ff5b1f) ![stack](https://img.shields.io/badge/data-local--first-ff5b1f)

## Highlights

- **Two-tap start**: Today → routine quick-start → you're logging.
- **One-tap sets**: last session's numbers are pre-loaded as ghost values; ✓ commits them, starts the rest timer and moves to the next set (keyboard: <kbd>Enter</kbd>).
- **Smart rest timer**: per-exercise defaults, ±time, pause, skip; timestamp-based so it survives backgrounding and reloads; chime, vibration and optional notification.
- **Live PR detection** with a non-blocking celebration and inline badges.
- **Routines**: drag to reorder exercises and sets, supersets, target weights/reps, per-exercise rest, duplicate, save any workout as a routine.
- **History**: monthly feed, full detail, edit past sessions, repeat, delete with undo.
- **Analytics**: weekly/monthly volume, e1RM / top-set / volume progression with record markers, training calendar heatmap, muscle balance radar, bodyweight trend, plain-language insights.
- **Plate calculator & warm-ups**: plates-per-side shown on every barbell lift (tap for an animated calculator with your bar weight), and one-tap warm-up ramps toward your working weight.
- **Records**: heaviest weight, best e1RM, best set volume, most reps — per exercise, with a PR timeline.
- **70+ exercise library** plus unlimited custom exercises.
- Dark-first premium UI with a light theme, mobile bottom nav + desktop rail, PWA/offline, JSON backup/restore and CSV export.

## Run locally

Requires Node 18+ (tested on Node 24).

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

```bash
npm run build      # typecheck + production build into dist/
npm run preview    # serve the production build
npm test           # vitest (domain logic + store flows)
npm run lint
```

Want to look around first? On the empty Today screen (or in Settings) choose **Load sample data** to generate a realistic 14-week log.

## iPhone app (Capacitor)

The same React app ships as a native iOS app through [Capacitor](https://capacitorjs.com). The web build is bundled into the app, so it runs fully offline with no server. Requires a Mac with Xcode 26+ and Node 18+.

```bash
npm run ios:sync   # build the web app and copy it into ios/
npm run ios        # …then open the Xcode project
npm run ios:run    # …or build and launch on a simulator / connected iPhone
```

To install on your own iPhone:
1. Xcode → Settings → Accounts → add your Apple ID (a free account works for personal installs; apps signed this way expire after 7 days — just press Run again).
2. Open `ios/App/App.xcodeproj` (`npm run ios`). For **both** the *App* and *ForgeTrackWidgets* targets → *Signing & Capabilities* → choose your team. If the bundle id `com.shijaykj.forgetrack` is taken, change it in `capacitor.config.ts`, the App target, and the widget target (`<app id>.ForgeTrackWidgets`).
3. On the iPhone: plug it in, trust the Mac, and enable *Settings → Privacy & Security → Developer Mode*.
4. Pick the phone as the run destination and press Run. The first launch may require *Settings → General → VPN & Device Management → trust your developer certificate*.

Native extras over the web version (all in `src/lib/native.ts`):
- **Taptic haptics** on taps, completed sets, rest end and PRs.
- **Rest-end notifications** scheduled with iOS, delivered even when the phone is locked.
- **Live Activity** on the lock screen and Dynamic Island during a workout: elapsed time, rest countdown with progress, sets done and the next exercise (`ios/App/ForgeTrackWidgets`).
- **Apple Health**: optional (Settings → Save to Apple Health); each finished workout is saved as a strength-training session. Write-only — ForgeTrack never reads health data.
- **Screen stays on** during a live workout (toggle in Settings; uses the Wake Lock API on the web).
- **Backup / CSV export** via the iOS share sheet (Save to Files, AirDrop).
- **Safety copy** of all data in *Files → On My iPhone → ForgeTrack*; restored automatically if the WebView storage is ever cleared.
- Status bar follows the app theme; branded icon and launch screen (`npm run icons` regenerates all PNGs).

## Deploy

`npm run build` produces a fully static `dist/` folder. Host it anywhere that serves static files; the only requirement is an SPA fallback (unknown paths → `index.html`).

- **Nginx**: `try_files $uri /index.html;`
- **Caddy**: `try_files {path} /index.html` + `file_server`
- **Netlify**: add `dist/_redirects` with `/* /index.html 200`
- **Vercel / Cloudflare Pages**: framework preset "Vite", output `dist` (SPA fallback is automatic on Pages; on Vercel add a rewrite to `/index.html`).
- **Docker**: `FROM nginx:alpine`, copy `dist/` to `/usr/share/nginx/html` and add the `try_files` rule above.

Serve over HTTPS so the service worker (offline support) and notifications work. Data is stored per browser/device in IndexedDB — use **Settings → Export backup** to move it between devices.

## Project docs

- [docs/PRODUCT_RESEARCH.md](docs/PRODUCT_RESEARCH.md) — public-information research and UX principles
- [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md) — screens, rules and speed budget
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — stack, layers, data model
- [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) — phases, decisions and status

## Keyboard shortcuts (desktop)

| Key | Action |
|---|---|
| <kbd>N</kbd> | Start / resume workout |
| <kbd>Enter</kbd> | In weight → jump to reps; in reps → complete set |
| <kbd>↑</kbd> <kbd>↓</kbd> | Adjust weight by plate step (2.5 kg / 5 lb) or reps by 1 |
| <kbd>T</kbd> / <kbd>S</kbd> / <kbd>+</kbd> / <kbd>-</kbd> | Rest timer: pause-resume / skip / +30 s / −15 s |

## Notes

ForgeTrack is an original product. Its research used only publicly observable information about workout-tracking apps; no third-party code, assets or branding are used. Insights describe your own logged data and are not medical or training advice.
