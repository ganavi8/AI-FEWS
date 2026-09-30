# AI·FEWS — full environmental intelligence workspace design

## Reference and chosen direction

The user-supplied `/location` page and the existing `9034bd3` AI·FEWS console are the visual ground truth. Preserve the “environmental operations console” rather than shifting to a marketing site, consumer weather app, unrelated stock imagery, or a generic admin template. The application is a calm, compact decision-support tool for location-aware environmental monitoring.

## Design dimensions

- **Design movement:** Contemporary environmental operations console; precise, field-ready and technical, not alarmist.
- **Core principles:** User control, trustworthy provider provenance, clear states for live/stale/unknown/configuration-required data, useful information density, meaningful mobile access, readable public warnings, and no fabricated measurements or certainty.
- **Color philosophy:** Near-black navy canvas (`#071321`), slightly lighter navy header/rail/panels, cool blue-gray borders and secondary text, operational cyan (`#30D6D2`) for primary actions, restrained amber for caution, and a distinct red only for high-severity/warning states. Maintain WCAG-conscious text/control contrast.
- **Layout paradigm:** Compact desktop header and narrow sidebar with an accessible mobile bottom navigation plus a “More” route menu. Main area is a readable workspace of location, environmental conditions, risk assessment, alerts and map/report cards. Keep `/location` as a first-class page and page-specific context on every route.
- **Signature elements:** Existing AI·FEWS mark and environmental-intelligence sublabel; small uppercase mono section labels; fine separators; honest online/data-state badges; data-source/freshness strips; consistent severity scale; concise location record; official-guidance caveat.
- **Interaction philosophy:** No location or notification permission on load. Browser/Android geolocation only after a clear user action and one-shot request. Manual coordinates remain available, validated immediately at latitude `-90..90` and longitude `-180..180`. Environmental data and geocoding are requested only after the user loads/selects a place; reverse geocoding is a distinct user action. Saving, sharing a report location, or enabling notifications requires an explicit action and clear privacy state.
- **Animation:** Minimal, quick transitions; restrained status movement; respect `prefers-reduced-motion`; never use animation to imply emergency certainty.
- **Typography system:** System UI sans for body/headings and system monospace for identifiers, technical metadata and coordinates; no remote font dependency.
- **Brand essence and voice:** Responsible environmental intelligence that helps people orient and prepare without overstating accuracy, predictive certainty, official authority or provider availability. Always state that official local emergency instructions take precedence.
- **Wordmark/logo:** Preserve the existing `AI·FEWS` identity and uploaded icon in header/favicon/native icon. Do not generate new promotional imagery for this operational dashboard.

## Product behavior boundaries

- Implement the user-specified shared React/TypeScript web/PWA and Capacitor Android interface, backed by one Node/TypeScript REST API and MySQL. Keep risk and alert decisions server-authoritative.
- Never hardcode a default city or present a synthetic observation as live. On missing/old provider results show `LIVE`, `RECENT`, `STALE`, `CACHED`, `UNAVAILABLE`, `CONFIGURATION REQUIRED`, `ERROR`, or `UNKNOWN` as applicable with source and timestamp.
- Only return real provider observations; advanced satellite/terrain/hydrology/historical-flood data stay explicitly unconfigured until a real source is set up. Simulation output must be visibly `SIMULATION` and never enter real observations or trends.
- Use browser/PWA local storage only for explicit offline caching and queued actions. Persist exact saved-location data only after explicit save; do not implement continuous/background geolocation or location-history collection for unsaved lookups.
- Keep public community reports clearly `COMMUNITY GENERATED`, unpublished until moderation approval, and separate from official/provider facts. Show local pending sync separately from server persistence and moderation status.
- Do not claim off-session alert/push delivery until its schedule/provider/device configuration is implemented and verified. Current product behavior evaluates alerts on explicit live assessment; no unrequested continuous provider polling.
