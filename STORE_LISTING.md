# AI·FEWS — Store Listing Draft

**Status:** Release candidate preparation only. This is not an approved Play Console data-safety declaration, a legal certification, a Play upload, or evidence of publication.

## Listing

- **App name:** AI·FEWS
- **Short description:** Local weather, air quality, risk context and offline safety guidance.
- **Category suggestion:** Weather
- **App ID configured in Capacitor:** `com.ganavi.aifews` — owner must confirm this organization/reverse-domain identity and Play Console availability before distributing an Android build. Application IDs cannot be safely guessed for a published product.
- **Version configured in package:** `1.0.0`; Android version code will be `1` if the generated native project keeps its default. No signed AAB has been built.
- **Privacy policy path:** `/privacy-policy`. Permanent HTTPS URL is **NOT VERIFIED** until a successful production publish.
- **Operator/contact:** Protected values are present but currently fail the public API's minimum completeness/format checks and are served as `NOT CONFIGURED`; no public policy using those entries should be released. Genuine details, contact-channel control/monitoring and jurisdiction-specific wording require direct owner/legal review before store submission.
- **Screenshots:** Android/device screenshots **NOT VERIFIED**; the sandbox has no Android SDK, emulator, or device.
- **Feature graphic:** A branded preparation asset may accompany this draft; review before Play Console use.
- **Icon:** `public/icons/aifews-512.png` (512×512 PNG), derived from the project mark.

## Full description draft

AI·FEWS is a location-aware environmental information and preparedness workspace. Where a user chooses to check an area, it can show current model-based weather and air-quality information, rainfall context, a transparent screening heuristic, and community reports awaiting review. Reports are not verified facts; only authenticated moderator-approved reports can appear as verified. The moderator credential/workflow is not configured in this release, so public verification is currently unavailable. Users can save places on this app installation, review actual observations collected for those saved places, prepare an offline safety guide, and submit a community report for review.

Location is optional. You can enter coordinates manually. The app asks for one-time device location only when you press the location action; it does not run a background location watcher. Reverse-geocoded place names are requested only after you choose that action. The app’s weather and air-quality display relies on third-party model/provider coverage and timestamps; data may be unavailable, stale, incomplete, or different from local conditions. Its rainfall/risk screen is an explicitly uncalibrated, rule-based decision-support heuristic. AI·FEWS is not an official warning system, does not calculate validated personal flood probabilities, and does not replace emergency services or official local guidance.

Selected offline snapshots, an offline preparedness guide, and pending reports can remain on this device until cleared or synchronized. A report may be visible to others only after moderation verification. Saved data is associated with a random installation key rather than a user account and does not automatically synchronize across devices. See the in-app Privacy Center and the public Privacy Policy for data flow, provider, retention, and deletion details.

**Features not configured for this release:** remote push alerts; moderator credential/workflow; official hydrology, satellite, terrain, historical-flood or warning-provider integrations; Android build/signing; Play Console distribution.

## Preliminary data-safety review — owner/legal confirmation required

This is a source-based review to help the owner complete Play Console’s current form. It is not a final declaration; classification and exact disclosure must be confirmed against the applicable Google Play form at submission time.

| Data area | Implemented handling to disclose/review |
|---|---|
| Precise location | Optional one-shot browser/Android location or manually entered coordinates. Coordinates are sent to the AI·FEWS backend for requested weather/air-quality queries; saved-place/history coordinates persist only after user action. Open-Meteo and, after a separate name-lookup action, Nominatim receive the applicable coordinates. Visible OpenStreetMap tiles go directly from the client. |
| User-generated content | A submitted community report sends category, description, location, timestamp and idempotency ID to the backend. Offline unsent reports remain in local IndexedDB. Server reports await moderation; verified reports can be displayed publicly. |
| App preferences/notification settings | Notification-category preferences can be associated with the anonymous installation key. Device permission and local-notification opt-in remain in device/browser settings. Local delivery is implemented as a best-effort attempt but has not been verified on physical Android devices or across browser runtimes. Remote push and background delivery are not configured. |
| Anonymous identifier | The device stores an app-generated random installation key; requests use it to address that installation’s saved records. The backend persists a keyed hash, not the raw key. No login or advertising identifier is implemented. Confirm the correct store-form category and linkage wording. |
| Analytics/ads | The application code contains no dedicated advertising, analytics or cross-site tracking integration. Confirm whether hosting/platform instrumentation is present and whether it must be disclosed separately. |
| Retention/deletion | App implements opportunistic 90-day observation/report cleanup and a 30-day alert archive rule, not a scheduled purge. Local privacy controls delete this device’s caches/preferences; a separate action deletes a saved place and linked snapshots/alerts. Synced report deletion is not user self-service. Current operator/support inputs fail minimum format checks and are displayed as `NOT CONFIGURED`; genuine details and a monitored channel are required before distribution. |
| Encryption in transit | Production is intended to use HTTPS. **NOT VERIFIED** until the final published URL and live requests are inspected. |
| Third-party recipients | Open-Meteo, OpenStreetMap Nominatim, OpenStreetMap map tiles, and the Manus/Webdev host and managed database; consult each recipient’s current privacy terms. |

## Remaining store gates

1. Confirm `com.ganavi.aifews` belongs to the publisher; do not upload using an unconfirmed ID.
2. Supply genuine operator legal name, public address and monitored support/deletion contact through the secure input card; ensure the API accepts them, complete owner/legal review of the Privacy Policy and Play data-safety form, and publish/verify its HTTPS URL.
3. Configure the protected moderation credential so privileged moderation is operational and testable.
4. Install/use a compatible JDK and Android SDK, build and verify the native application, configure owner-controlled signing, and generate/test an AAB. Never put signing credentials in the repository.
5. Capture actual screenshots from the tested Android build and finalize app-permission explanations/data safety.
6. Obtain Play Console owner access and submit manually; this project has not been submitted or published.
