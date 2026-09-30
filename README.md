# AI·FEWS — AI Flood & Environmental Warning System

AI·FEWS is a location-aware environmental decision-support workspace for web browsers, installable PWAs and an Android source project. Its visual direction preserves the compact dark field console from the original `9034bd3` UI. The requested backend reference `4ccd474e53ed8b4adfeb7a46a1bc51a0749121fc` was not recoverable from the available repository, remote, reflog or object storage. This system was rebuilt against the supplied requirements; it is **not** a restored production backend.

> **Release assessment (30 September 2026): NOT YET PRODUCTION-READY.** The application source and managed MySQL Preview are available. Current protected public-policy inputs fail minimum completeness/format checks and the public-config API now fails closed to `NOT CONFIGURED`; no public publish is being made with those inputs. Remaining gates include genuine owner-approved policy details and legal review, a configured/verified moderation credential, Android SDK/JDK + owner signing workflow/AAB/device testing, and successful deployment checks. See [`docs/RELEASE_EVIDENCE.md`](docs/RELEASE_EVIDENCE.md) and [`STORE_LISTING.md`](STORE_LISTING.md).

## Architecture

```text
Web browser / installed PWA / Capacitor Android
        │  React + TypeScript; one consent-first location flow
        │  IndexedDB app shell, cached snapshots and queued reports
        ▼
Static Vite client ── same-origin /api/* ── Express + Zod API
                                                ├─ Open-Meteo weather/air quality
                                                ├─ explicit Nominatim reverse lookup
                                                ├─ server-side risk and alert evaluation
                                                ├─ report sync/moderation endpoints
                                                └─ parameterized MySQL repository
                                                        │
                                                        ▼
                                           managed MySQL (Webdev)
```

The frontend never connects to MySQL directly. The browser and Android app share the same API contracts and server-side risk implementation; Android is not a second backend. During Preview, the dev server runs Express with Vite middleware on the configured listener. The published target is a **mixed deployment**: `dist/client` as static files, API requests routed to the production container, and managed MySQL for persistence. Dynamic API responses are `no-store`; fingerprinted assets are immutable and the application shell/service worker are revalidated.

## Implemented screens and behavior

The route inventory is maintained in [`public/manus-routes.json`](public/manus-routes.json). Screens include Dashboard, Location, Environment, Risk, Alerts, Map, Community, Trends, Data Quality, Sources, Preparedness, Emergency guidance, Simulation, Saved Locations, Notifications, Settings, Privacy Center, public Privacy Policy and About.

- Location is optional: manual coordinates are supported; browser/native geolocation runs only after an explicit one-shot user action. Place-name resolution is a separate action.
- Weather and air quality are fetched from Open-Meteo through server adapters. Values carry provider/source and freshness/availability metadata. Nominatim reverse geocoding is user initiated, proxied, cached and globally throttled to at most one upstream request per second. OpenStreetMap tiles are fetched only for the visible map; they are not prefetched for offline use.
- `RuleBasedHeuristic-v1.0` is a transparent server-side rainfall screening heuristic. Insufficient input yields `UNKNOWN`; there is no trained or validated flood model, probability, confidence or accuracy metric.
- Alerts are evaluated by the server from live assessment inputs and persisted/deduplicated in MySQL. The client does not claim guaranteed off-session or remote-push delivery.
- All server-side notification categories default off until an installation explicitly saves its choices; device permission and per-device local opt-in are separate choices. The app attempts device-local display after a persisted alert is encountered on refresh, but delivery has not been verified on physical Android devices or across browser runtimes; remote push/background delivery is not configured.
- Community reports are always labeled **COMMUNITY GENERATED**, have a stable `clientId`, and are stored as `PENDING_REVIEW`. Only `VERIFIED` reports appear in geographic public queries. The moderation API requires the server-only `MODERATION_TOKEN`; this credential is currently not configured, so moderator actions safely fail as `MODERATION_NOT_CONFIGURED` rather than being available to ordinary users.
- Satellite, terrain, hydrology and historical-flood endpoints return **CONFIGURATION REQUIRED** until real providers are configured. Simulation is clearly labeled and does not become an observation or trend.
- The service worker caches the app shell/versioned assets and IndexedDB (`aifews-offline`) holds timestamped snapshots, reports and preparedness content. APIs and map tiles are not cached as current truth. Offline reports remain `PENDING SYNC` until server confirmation, and retain the same ID across retry.
- The Privacy Center distinguishes device-local clearing from server deletion. The public `/privacy-policy` receives operator name, postal address and support contact from protected runtime configuration only when minimum non-placeholder format checks pass; otherwise it shows `NOT CONFIGURED`. The current protected entries fail those checks. Their contents are deliberately absent from source/docs. The operator must still confirm the values and review the notice and jurisdiction-specific legal wording.

## Project structure

```text
src/
  client/
    app/                 App shell, shared components, location context
    pages/               Route-level screens (Dashboard, Location, Risk, ...)
    services/             Typed API, geolocation, notifications, IndexedDB/sync
    styles.css            Responsive visual system
  server/
    alerts/               Alert derivation and deduplication inputs
    db/                   MySQL migration runner, pool, repository
    middleware/           Rate limits and cross-cutting request controls
    providers/            Open-Meteo and Nominatim adapters
    risk/                 Canonical server-side screening heuristic
    routes/               REST handlers and request context
    services/             Environment, simulation and provider catalog/state
  shared/contracts.ts     Canonical Zod DTOs and request/response schemas

db/migrations/            Additive, versioned MySQL schema
public/                    PWA manifest, icons, service worker, route manifest
scripts/                    PWA precache generation and verification scripts
tests/                      Vitest integration, UI, location, risk and offline tests
android/                    Capacitor Android source project and branded assets
Dockerfile                  Production API-container build/entrypoint
capacitor.config.ts         Native app identity and packaged-web settings
plan.md                     Rebuild plan, acceptance criteria and architecture
STORE_LISTING.md            Play Store metadata/data-safety draft, not submission
```

## Requirements and configuration

Use Node.js 22 and pnpm (the Webdev static build pins pnpm `11.25.0` through Corepack). Managed production/Preview values are supplied through protected project environment configuration; no secret should be committed, included in a web bundle, placed in local storage or copied into a report.

| Variable | Use | Notes |
|---|---|---|
| `DATABASE_URL` | MySQL connection string | Server/container only. The managed database injects it when available; never place it in client code. Preview and production use the project’s shared managed database. |
| `MODERATION_TOKEN` | Privileged moderation authorization | Server only; currently not configured. The API fails closed. Use the secure environment input surface before enabling moderation. |
| `PUBLIC_OPERATOR_NAME` | Public legal operator identity | Protected runtime input; displayed only after the minimum format check, otherwise `NOT CONFIGURED`. |
| `PUBLIC_OPERATOR_ADDRESS` | Public operator postal address | Protected runtime input; displayed only after the minimum format check, otherwise `NOT CONFIGURED`. |
| `PUBLIC_SUPPORT_CONTACT` | User-facing support/privacy/deletion contact | Protected runtime input; requires a syntactically valid email or HTTPS URL, otherwise `NOT CONFIGURED`. |
| `PORT` | HTTP listener port | Supplied by the container host; local template defaults to `3000`. |
| `NODE_ENV` | Runtime mode | Local template uses `development`; container uses production configuration. |
| `OPEN_METEO_FORECAST_URL` | Forecast API base URL | Optional provider override; public Open-Meteo endpoint is the default. |
| `OPEN_METEO_AIR_QUALITY_URL` | Air-quality API base URL | Optional provider override; public Open-Meteo endpoint is the default. |
| `NOMINATIM_REVERSE_URL` | Reverse-geocoding API base URL | Optional provider override; public Nominatim endpoint is the default. |

`.env.example` contains empty placeholders only. For local development, copy it to an untracked `.env` and use a disposable/owner-controlled database; do not commit populated environment files. Real operator contact values are not included in this repository.

## Install and run

```bash
corepack enable
corepack prepare pnpm@11.25.0 --activate
pnpm install --frozen-lockfile
pnpm dev
```

`pnpm dev` starts Express with Vite middleware on port `3000` (or `PORT`). The health route is `GET /api/health`; readiness is `503 NOT_READY` until database connection and migrations pass. The local service is not a production deployment.

## API inventory

All app routes are mounted under `/api` and use shared request/response schemas, bounded inputs, structured errors, rate limits and `Cache-Control: no-store`.

- **Health/config/catalog:** `GET /health`, `/public-config`, `/data-quality`, `/providers`, `/models`.
- **Location/environment:** `GET /location`, `/weather`, `/rainfall`, `/air-quality`, `/environment`, `/risk`, `/risk/explain`.
- **History/alerts/notifications:** `GET /trends`, `/alerts`, `/notifications`; `PUT /notifications/preferences`.
- **Community:** `GET /community-reports?lat=<lat>&lon=<lon>&radiusKm=<km>`, `POST /community-reports`, `POST /sync`, protected `PATCH /community-reports/:id/moderation`.
- **Saved locations:** `GET`/`POST /saved-locations`, `PATCH`/`DELETE /saved-locations/:id` (installation-key scoped).
- **Simulation/advanced providers:** `GET /simulation?scenario=...`, `/satellite`, `/terrain`, `/hydrology`, `/historical-floods`.

## Database

The ordered additive migrations are `db/migrations/0001_platform.sql` and `db/migrations/0002_assessment_idempotency_opt_in_defaults.sql`. The second adds location/time uniqueness for idempotent environment/risk snapshot writes and changes notification-category column defaults to disabled without overwriting existing explicit preference values. The schema includes community reports (unique `client_id`), saved locations, environment/risk snapshots, alerts (unique fingerprint), notification preferences, API rate-limit coordination and provider throttles. Run:

```bash
pnpm db:migrate
pnpm db:check
```

`pnpm db:check` applies migrations and runs isolated temporary inserts/reads through independent pools, including repeat-assessment deduplication, all-off notification defaults, report idempotency and alert/preferences persistence, then attempts to remove its fixtures. It is a **write test**, not a read-only health probe; run only against the intended database and inspect the cleanup receipt. A failed cleanup is an incident to resolve before continuing.

## Verification commands

```bash
pnpm typecheck
pnpm test
pnpm build:web
pnpm build:server
pnpm build                         # typecheck + tests + web/server builds
pnpm verify:providers              # live, read-only requests to public providers
pnpm android:sync                  # web build + Capacitor sync (no APK/AAB)
pnpm android:bundle                # Android release AAB; requires Android toolchain/signing setup
```

`pnpm verify:providers` checks a fixed public test coordinate and reports provider/HTTP/freshness metadata; it makes live outbound provider calls. No provider credentials are logged. `pnpm android:sync` does not prove a native build or device behavior. This Sandbox has no Android SDK/JDK/emulator or configured owner signing credentials; a release APK/AAB and device test are not available here.

## WebDev release configuration

The configured build contract produces `dist/client` for static hosting and builds `Dockerfile` for the Express API, routes `/api/*` to the server, and enables the managed MySQL capability. PWA manifest ownership is application-managed. The infrastructure overview still reports `not_deployed`; a local commit, Preview or config declaration is not proof of publication. Public publication remains blocked while the public operator/support values fail validation. Only a successful Publish receipt and live checks establish the public URL; see `docs/RELEASE_EVIDENCE.md`.

## Privacy, legal and store status

The public policy is route `/privacy-policy`; a Play Store listing and data-safety worksheet are in `STORE_LISTING.md`. Protected policy inputs exist but currently fail the application's minimum shape checks, so the policy correctly shows `NOT CONFIGURED`; the values are not included here. This does **not** constitute the operator’s legal approval or Google Play declaration. The app is not published to Google Play. The stable Android application ID `com.ganavi.aifews` must be confirmed by the publisher before any native distribution. No signing key is in the repository.

See [`docs/RELEASE_EVIDENCE.md`](docs/RELEASE_EVIDENCE.md) for the final feature/platform/test matrix and unresolved release gates.
