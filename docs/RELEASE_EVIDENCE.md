# AI·FEWS Release Evidence

**Evidence date:** 30 September 2026

**Final classification:** **NOT YET PRODUCTION-READY**

**Environment:** Sandbox project and Webdev Preview; no production publication.

## Release decision and current gate

The recovered production-backend commit was unavailable. This application was rebuilt against the supplied specification; it is not a restoration of that missing backend.

The local production build and the managed-MySQL Preview checks pass. However, the protected public-policy inputs currently fail minimum completeness/format checks. The API now suppresses them as `NOT CONFIGURED`, and the Privacy Policy explicitly warns that the operator identity/address and support contact are incomplete. **No public publish was made.** Webdev reports the project as `not_deployed`; the permanent HTTPS URL and production behavior are therefore unverified. Auto-publish is disabled.

Other blocking items remain: privileged moderation is disabled until `MODERATION_TOKEN` is supplied and tested; a native AAB cannot be built without the Android SDK and owner-controlled signing setup; local notification delivery and native behavior have not been verified on target devices; and the public policy still needs owner/legal review.

## Architecture verified in source/Preview

```text
React + TypeScript + Vite (Web/PWA; Capacitor Android source)
                   │ relative /api/* calls
                   ▼
          Express + shared Zod contracts
             ├── Open-Meteo weather/AQI
             ├── explicit Nominatim reverse geocoding
             ├── server-side rainfall heuristic and alert derivation
             └── parameterized MySQL repository
```

The Webdev project configuration declares a static `dist/client` build, an Express API container (`Dockerfile`, `/api/health`), managed server/database features, application-owned PWA manifest, eight ordered route rules and runtime port 3000. These are **declared build/deploy settings, not evidence of publication**. The latest project config revision read was 8, with auto-publish false. The infrastructure overview reported `deployStatus: not_deployed`, `hosting: not_declared`, and no effective published routes.

The Android project uses the same packaged React application and API contracts. It does not contain a separate backend.

## Verification results

| Check | Result | Evidence and limits |
|---|---|---|
| TypeScript client/server checks | **PASS** | Included in `pnpm build`; both `tsc --noEmit` projects completed. |
| Automated tests | **PASS** | Final `pnpm build` ran 7 Vitest files and 24 tests: risk (3), alerts (4), API (10), cached environment (1), location (2), offline (3), UI (1). Synthetic fixtures are expressly test-only; they are not environmental observations. |
| Production client build | **PASS** | Vite built `dist/client`; service-worker generator prepared the offline shell and 34 versioned app assets. |
| Production server build | **PASS** | `tsc -p tsconfig.server.json` completed. |
| Built web artifacts and route manifest | **PASS** | `index.html`, service worker, manifest, route manifest and branded 192/512 icons present; all 20 routes include dashboard and privacy-policy; built service worker excludes `/api/` traffic from cache. |
| Webdev Preview reachability | **PASS — temporary Preview only** | [Open the current Preview](https://8328-ioznn76qnh7orvtl83i0d-c51ce3e4.sg2.manus.computer/). External GET returned HTTP 200 and branded HTML; `/api/health` returned `READY` with database/migrations ready, and `/api/public-config` exposed only `NOT CONFIGURED` for rejected policy inputs. This Preview URL is temporary and is not a production release URL. |
| MySQL migrations/readiness | **PASS in Preview** | `/api/health` returned 200 `READY`; additive migration 0002 applied successfully, adding unique location/time keys for environment/risk snapshots and disabling category columns by default. Existing explicit preference values were not rewritten. |
| MySQL persistence | **PASS in Preview** | Final `pnpm db:check`: saved locations persisted across independent pools; duplicate assessment inserts produced exactly one environment and risk snapshot; report insert/select idempotency persisted across pools; saved-location alert/preferences persistence passed; a new owner had all notification categories disabled; temporary records were cleaned up via the saved-place cascade. This is a write test against the configured managed database, not production evidence. |
| Cached provider result and saved history | **PASS — regression verified** | Unit/API tests confirm cached source-observation ages advance, request method/name reflect the current saved-place request, an unsaved lookup is not persisted, and a usable real provider cache result is attached only after that place is explicitly saved. Cache hits derive no new alert, and MySQL uniqueness prevents duplicate snapshots for one provider capture. |
| Open-Meteo Forecast | **PASS — live provider sample** | Read-only fixed public London test coordinate; HTTP 200; provider-observed `2026-09-30T09:00:00Z`; fetched `2026-09-30T09:01:57Z`; freshness `LIVE`. Not a device/user location or a guarantee of future availability. |
| Open-Meteo Air Quality | **PASS — live provider sample** | Same fixed public London test coordinate; HTTP 200; provider-observed `2026-09-30T09:00:00Z`; fetched `2026-09-30T09:02:01Z`; freshness `LIVE`. Not a device/user location or a guarantee of future availability. |
| OpenStreetMap Nominatim | **PASS — live lookup** | User-action provider verification script at the same fixed public test location; HTTP 200 at `2026-09-30T09:02:05Z`. This does not imply background geolocation. |
| Risk engine | **PASS — rule logic only** | Existing risk tests pass; output remains an uncalibrated server-side screening heuristic, not a validated flood probability or trained model. |
| Alert engine | **PASS — threshold logic only** | New synthetic-fixture tests check rainfall/probability thresholds, higher severity, expiry, stable fingerprinting, stale-weather suppression, and AQI threshold. MySQL alert persistence was separately exercised with a temporary fixture that was cleaned up. No result claims a current real-world hazard. |
| Community report/API sync | **PASS — submission/idempotency path** | API tests cover report submission, stable client ID, sync retry and validation; MySQL check confirms durable idempotency. Public listing remains limited to moderator-verified reports. |
| Moderation | **NOT CONFIGURED** | `MODERATION_TOKEN` is absent. Integration test confirms moderation fails closed with `503 MODERATION_NOT_CONFIGURED`; no privileged moderation workflow is available in this release. |
| Offline IndexedDB | **PASS — unit coverage** | Tests cover a cached snapshot retaining source time/status, a report surviving the pending-sync path, and `SYNCED` only after a server response. Tests also verify device-local clearing. Real offline browser/device network transitions were not separately exercised. |
| Location consent | **PASS — adapter/UI tests** | One-shot `getCurrentPosition` test confirms exactly one call and no watch/background updates; denial supplies manual-coordinate guidance. Physical Android/browser permission dialogs were not tested. |
| Saved locations | **PASS — database persistence** | Independent-pool MySQL save/query round trip passed and temporary fixture cleanup was confirmed. |
| Notification preference defaults | **PASS — server/database verified** | API and managed-MySQL checks confirm every alert category is off for an installation with no saved choices. Device permission and local opt-in remain separate; this does not verify delivery. |
| Notifications | **NOT VERIFIED on target devices** | Preference persistence and explicit permission/opt-in code are present. Device-local delivery was not tested on a physical Android device or across browser runtimes; remote push and background/off-session delivery are not configured. Do not claim guaranteed delivery. |
| Required independent integration review | **PASS WITH FINDINGS RESOLVED** | The read-only review found (1) cached source ages were not updated, (2) a saved-place request reusing a real cache result could skip persistent history, and (3) server notification-category defaults were enabled. Fixes were checked with the focused API/cache regressions, final full build, and managed-MySQL migration/idempotency/default checks. The review was not repeated. |
| PWA | **PASS — build/Preview evidence** | Application-owned manifest, service worker, icons, versioned app shell and 20-route manifest are built. Final Dashboard and fail-closed policy screenshots were rendered at desktop and phone-width Preview viewports after the last code change. This is not public HTTPS or Android-device verification. |
| Android app identity/assets | **SOURCE CONFIGURED; BUILD NOT VERIFIED** | `com.ganavi.aifews`, app name `AI·FEWS`, version `1.0.0`, version code `1`, locally packaged `dist/client`; branded map-pin foreground PNGs and scoped manifest permissions. Publisher must still confirm ownership of the reverse-domain ID. |
| Android AAB/APK | **NOT GENERATED** | `pnpm android:bundle` completed web build and Capacitor sync but Gradle failed because Android SDK location is unavailable (`ANDROID_HOME`/`sdk.dir`). No AAB or APK exists. Owner-controlled release signing and device testing remain required. |
| Secret-pattern/diff check | **PASS — limited static check** | `git diff --check` passed. A redacted scan for private-key blocks and high-confidence OpenAI/Google/AWS/Slack token patterns found no matches in source. `gitleaks`/`trufflehog` were not installed; this is not a comprehensive security audit. |
| Public policy inputs | **NOT CONFIGURED for publication** | Protected entries are not in Git or this report. The API's minimum shape checks reject current operator/contact values and returns only `NOT CONFIGURED`; Preview policy displays the warning. Genuine operator details, contact monitoring and owner/legal review remain a release gate. |
| Production HTTPS/deployment | **NOT DEPLOYED / NOT VERIFIED** | No Publish operation was submitted. There is no permanent URL to report. Public HTTPS, production API routing/database, service worker and offline behavior have not been verified. |
| Play Store | **Preparation only** | Listing/data-safety draft exists. No signed AAB, tested Android screenshots, Play Console declaration, submission or publication. Manual Play Console action remains required after all release gates. |

## API inventory

The API is mounted under `/api`. Implemented routes include:

- `GET /health`, `/public-config`, `/data-quality`, `/providers`, `/models`
- `GET /location`, `/weather`, `/rainfall`, `/air-quality`, `/environment`, `/risk`, `/risk/explain`
- `GET /alerts`, `/trends`, `/notifications`
- `PUT /notifications/preferences`
- `GET /community-reports`, `POST /community-reports`, `POST /sync`, protected `PATCH /community-reports/:id/moderation`
- `GET`/`POST /saved-locations`, `PATCH`/`DELETE /saved-locations/:id`
- `GET /simulation`, `/satellite`, `/terrain`, `/hydrology`, `/historical-floods`

Responses use shared contracts, structured errors and no-store handling; advanced providers return configuration-required states rather than fabricated observations.

## Privacy and Android/store gates

- The public policy is implemented at `/privacy-policy`; the Privacy Center describes local-vs-server clearing. The page currently marks legal name/address/contact as `NOT CONFIGURED` because current values fail minimum format checks.
- Confirm genuine owner/operator identity, public postal address, monitored support/deletion contact and jurisdiction-specific legal wording before public release.
- Configure and test an authorized moderation workflow before claiming moderated community reporting is operational.
- Verify app ID ownership, obtain a compatible JDK/Android SDK, configure signing privately, build/test the native app, produce an AAB, test permissions/notification behavior, and capture screenshots from that tested Android build.
- Complete owner-approved Play data-safety answers and submit manually through Play Console. The application has not been published there.

## Files changed for this continuation

- `src/server/routes/data.ts` — fail-closed public operator/contact shape validation.
- `src/client/pages/PrivacyPolicyPage.tsx` — truthful notification-delivery verification statement.
- `src/server/services/environment.ts`, `src/server/routes/environment.ts`, and `src/server/db/repository.ts` — cache-age, explicit saved-place history and idempotent assessment handling.
- `db/migrations/0002_assessment_idempotency_opt_in_defaults.sql` — additive snapshot uniqueness and default-off category columns.
- `tests/api.test.ts`, `tests/environment-cache.test.ts`, and `scripts/db-check.ts` — public-config, cache-hit, notification-default and real-MySQL regressions.
- `tests/alerts.test.ts` — new rule-threshold and lifecycle tests using synthetic fixtures only.
- `android/app/src/main/res/drawable-v24/ic_launcher_foreground.xml` — removed unused generic Capacitor asset; adaptive launchers reference branded mipmap assets.
- `README.md`, `STORE_LISTING.md`, `plan.md` — updated release gates and evidence boundaries.
- `docs/RELEASE_EVIDENCE.md` — this report.

A canonical-main checkpoint/publish receipt has not yet been added to this evidence file. Record it only after the corresponding operation succeeds; never infer publication from Preview, source, a config declaration or a local commit.
