# 🌧️ AI·FEWS

## AI Flood & Environmental Warning System

<p align="center">

### **Detect • Explain • Prepare • Notify • Stay Aware**

A location-aware environmental decision-support platform for **web browsers, installable PWAs, and Android**.

<br>

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react\&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript\&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite\&logoColor=white)](https://vite.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=node.js\&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-API-000000?logo=express\&logoColor=white)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-Database-4479A1?logo=mysql\&logoColor=white)](https://www.mysql.com/)
[![Capacitor](https://img.shields.io/badge/Capacitor-Android-119EFF?logo=capacitor\&logoColor=white)](https://capacitorjs.com/)
[![PWA](https://img.shields.io/badge/PWA-Offline--First-5A0FC8?logo=pwa\&logoColor=white)](https://web.dev/progressive-web-apps/)

<br>

**🌐 Web/PWA:** [AI·FEWS](https://aifews-mwbcgb9q.manus.space)

**💻 Repository:** [github.com/ganavi8/aifews](https://github.com/ganavi8/aifews)

</p>

---

# 🚨 Release Status

> **⚠️ NOT YET PRODUCTION-READY**

**Release assessment: 30 September 2026**

The application source and managed MySQL Preview are available, but the system remains behind explicit release gates.

Current blockers include:

* Protected public-policy inputs requiring owner confirmation and legal review
* Moderation credential configuration
* Android SDK/JDK setup
* Release signing workflow
* Physical Android device testing
* AAB verification
* Notification/FCM production verification
* Successful final deployment checks

This README intentionally distinguishes between:

```text
Implemented
    ↓
Configured
    ↓
Tested
    ↓
Deployed
    ↓
Verified
    ↓
Production Ready
```

A feature being present in source code does **not** automatically mean that it is active or verified in production.

Detailed release evidence is maintained in:

```text
docs/RELEASE_EVIDENCE.md
```

---

# 🌍 What is AI·FEWS?

**AI·FEWS — AI Flood & Environmental Warning System** is a location-aware environmental decision-support workspace designed to help users understand changing environmental conditions and prepare accordingly.

The platform combines:

```text
🌦️ Environmental Data
        +
📍 Location Context
        +
🧠 Explainable Risk Assessment
        +
⚠️ Alert Evaluation
        +
👥 Community Reports
        +
📊 Trends & Insights
        +
📴 Offline-First Support
        +
📱 Android / PWA
```

into one application.

AI·FEWS is designed for both **urban and rural environments** rather than being permanently tied to a single geographic location.

---

# 🎯 The Problem

Environmental information is often fragmented across different services.

A user may have access to:

* Weather information
* Rainfall information
* Air-quality information
* Maps
* Local observations

but still have difficulty answering:

> **"What does the current environmental situation mean for my location?"**

AI·FEWS attempts to bridge that gap by transforming environmental inputs into:

```text
Environmental Conditions
          ↓
Location Context
          ↓
Risk Screening
          ↓
Explanation
          ↓
Alert / Preparedness Information
```

The goal is not to replace official emergency systems.

The goal is to provide an additional **environmental awareness and decision-support layer**.

---

# ✨ Core Capabilities

| Capability                         | Current State             |
| ---------------------------------- | ------------------------- |
| 🌦️ Weather information            | ✅ Implemented             |
| 🌧️ Rainfall screening             | ✅ Implemented             |
| 🌫️ Air-quality information        | ✅ Implemented             |
| 📍 Location-aware workflow         | ✅ Implemented             |
| 🧠 Explainable risk engine         | ✅ Implemented             |
| ⚠️ Alert persistence               | ✅ Implemented             |
| 🔔 Notification preferences        | ✅ Implemented             |
| 👥 Community reports               | ✅ Implemented             |
| 🛡️ Moderation architecture        | 🟡 Credential required    |
| 📴 Offline application shell       | ✅ Implemented             |
| 💾 IndexedDB storage               | ✅ Implemented             |
| 🔄 Offline report synchronization  | ✅ Implemented             |
| 🌐 Progressive Web App             | ✅ Implemented             |
| 📱 Capacitor Android project       | ✅ Implemented             |
| 🗺️ Map interface                  | ✅ Implemented             |
| 📊 Environmental trends            | ✅ Implemented             |
| 🧰 Preparedness guidance           | ✅ Implemented             |
| 🧪 Simulation                      | ✅ Implemented             |
| 🛰️ Satellite integration          | 🚧 Configuration required |
| ⛰️ Terrain integration             | 🚧 Configuration required |
| 🌊 Hydrology integration           | 🚧 Configuration required |
| 🤖 Validated ML flood model        | 🚧 Future development     |
| 📲 Verified remote background push | 🚧 Not yet verified       |

---

# 🧭 How AI·FEWS Works

The complete system follows a simple pipeline:

```text
                   ┌─────────────────┐
                   │      USER       │
                   │ Web / PWA / APK │
                   └────────┬────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ 📍 LOCATION     │
                   │ Context         │
                   └────────┬────────┘
                            │
                            ▼
             ┌──────────────────────────────┐
             │ 🌦️ ENVIRONMENTAL PROVIDERS   │
             │                              │
             │ Weather                      │
             │ Rainfall                     │
             │ Air Quality                  │
             └──────────────┬───────────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ 🧹 VALIDATION   │
                   │ & Freshness     │
                   └────────┬────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ 🧠 RISK ENGINE  │
                   │                 │
                   │ RuleBased       │
                   │ Heuristic-v1.0  │
                   └────────┬────────┘
                            │
                  ┌─────────┴─────────┐
                  ▼                   ▼
          ┌───────────────┐   ┌───────────────┐
          │ 💡 EXPLANATION│   │ ⚠️ ALERT      │
          └───────┬───────┘   └───────┬───────┘
                  │                   │
                  └─────────┬─────────┘
                            ▼
                   ┌─────────────────┐
                   │ 📊 USER DASHBOARD│
                   │                 │
                   │ Risk            │
                   │ Trends          │
                   │ Alerts          │
                   │ Preparedness    │
                   └────────┬────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ 🧑 USER ACTION  │
                   └─────────────────┘
```

---

# 🏗️ System Architecture

```text
Web Browser / Installed PWA / Capacitor Android
                         │
                         │
                         ▼
              ┌─────────────────────┐
              │ React + TypeScript  │
              │ Vite Client         │
              └──────────┬──────────┘
                         │
                         │ same-origin /api/*
                         ▼
              ┌─────────────────────┐
              │ Express + Zod API   │
              │                     │
              │ Server-side logic   │
              └──────────┬──────────┘
                         │
        ┌────────────────┼─────────────────┐
        │                │                 │
        ▼                ▼                 ▼
 ┌────────────┐   ┌────────────┐   ┌─────────────┐
 │ Open-Meteo │   │ Nominatim  │   │ Risk Engine │
 │ Weather /  │   │ Reverse    │   │ & Alerts    │
 │ Air Quality│   │ Geocoding  │   │             │
 └────────────┘   └────────────┘   └──────┬──────┘
                                          │
                                          ▼
                                ┌─────────────────┐
                                │ MySQL Repository│
                                │                 │
                                │ Persistence     │
                                └─────────────────┘
```

### Architectural principle

The frontend **never connects directly to MySQL**.

Instead:

```text
Frontend
   ↓
API
   ↓
Server
   ↓
Repository
   ↓
MySQL
```

This keeps database access and sensitive operations server-side.

---

# 🧱 Technology Stack

## Frontend

```text
React
TypeScript
Vite
```

The frontend contains the application shell, route-level screens, location context, API services, notification handling, IndexedDB integration, and responsive styling.

---

## Backend

```text
Node.js
Express
TypeScript
Zod
```

The backend provides:

* REST APIs
* Input validation
* Risk assessment
* Alert evaluation
* Community report processing
* Provider integration
* Database persistence
* Rate limiting
* Configuration handling

---

## Database

```text
Managed MySQL
```

Used for persistent application state including:

* Environmental/risk snapshots
* Alerts
* Notification preferences
* Community reports
* Saved locations
* Provider throttling
* Rate-limit coordination

---

## Mobile

```text
Capacitor
Android
```

Android uses the same web application and backend architecture.

It is **not a separate backend**.

---

## Offline

```text
Service Worker
+
IndexedDB
```

The offline database is:

```text
aifews-offline
```

---

# 📱 Web + PWA + Android

AI·FEWS is designed as a multi-platform application:

```text
                  AI·FEWS
                     │
          ┌──────────┼──────────┐
          │          │          │
          ▼          ▼          ▼
        🌐 Web      📲 PWA    🤖 Android
          │          │          │
          └──────────┼──────────┘
                     │
                     ▼
              Same Backend API
```

This avoids maintaining separate application logic for each platform.

---

# 📍 Location Architecture

Location is **optional**.

AI·FEWS supports:

* Manual coordinates
* Explicit browser/native geolocation
* Place-name resolution
* Saved locations

Browser/native geolocation is triggered only after an explicit user action.

The application does not silently request location simply because the page was opened.

---

# 🗺️ Location Flow

```text
User
 │
 ├── Manual coordinates
 │
 ├── Use current location
 │
 └── Search / resolve place
          │
          ▼
     Location Context
          │
          ▼
 Environmental APIs
          │
          ▼
       Risk Engine
```

Place-name resolution is deliberately separate from the initial location selection flow.

---

# 🌦️ Environmental Data

AI·FEWS currently uses server-side adapters for environmental providers.

### Open-Meteo

Used for:

* Weather
* Forecast-related environmental data
* Air quality
* Rainfall-related inputs

Provider values include source and freshness/availability metadata.

---

# 🗺️ Nominatim

Nominatim is used for explicit reverse geocoding.

The implementation:

* Proxies requests through the server
* Caches suitable responses
* Applies global throttling
* Limits upstream requests to at most one request per second

The browser does not directly perform uncontrolled reverse-geocoding requests.

---

# 🧠 Risk Assessment

The current risk implementation is:

```text
RuleBasedHeuristic-v1.0
```

It is a transparent server-side **rainfall screening heuristic**.

The system intentionally avoids presenting unsupported machine-learning claims.

### Important distinction

Current implementation:

```text
Environmental Input
        ↓
Rule-Based Screening
        ↓
Risk State
        ↓
Explanation
```

Future research:

```text
Historical + Multimodal Data
        ↓
Machine Learning
        ↓
Validated Prediction
```

These are different stages of the project.

---

# ⚠️ Risk States

When sufficient input is available, the risk engine can produce a meaningful environmental screening result.

When input is insufficient:

```text
UNKNOWN
```

is returned.

The system does **not** invent a risk score simply because an answer is expected.

---

# 💡 Explainable Risk

AI·FEWS includes a dedicated risk explanation endpoint:

```text
GET /api/risk/explain
```

The purpose is to allow the application to communicate the reasoning behind the current screening result instead of displaying an unexplained number.

Conceptually:

```text
Rainfall / Environmental Inputs
             ↓
       Screening Rules
             ↓
       Risk Assessment
             ↓
          WHY?
             ↓
       Explanation
```

---

# ⚠️ No Unsupported AI Claims

The current system does **not** claim to have:

```text
❌ A trained flood forecasting model
❌ A validated flood probability
❌ A statistically validated confidence score
❌ A production flood-prediction accuracy metric
```

This distinction is intentionally documented to keep the project technically and scientifically honest.

---

# 🚨 Alert Architecture

Alerts are evaluated server-side.

The workflow is:

```text
Environmental Data
       ↓
Risk Assessment
       ↓
Alert Evaluation
       ↓
Fingerprint / Deduplication
       ↓
MySQL Persistence
       ↓
Client Retrieval
```

Alerts are persisted and deduplicated.

The client does not claim guaranteed remote notification delivery.

---

# 🔔 Notification Preferences

Notification categories default to:

```text
OFF
```

until an installation explicitly saves its choices.

There are separate concepts for:

```text
Server notification preference
        +
Device notification permission
        +
Local user opt-in
```

This prevents notification behavior from being silently enabled.

---

# 👥 Community Reporting

AI·FEWS provides a community reporting system for local observations.

A report can represent an observation from the user's surroundings.

Examples include:

```text
🌊 Waterlogging
🌧️ Heavy local rainfall
🚧 Local environmental hazard
🌍 Other environmental observations
```

Every report is clearly labeled:

```text
COMMUNITY GENERATED
```

---

# 🔄 Community Report Lifecycle

```text
              User
                │
                ▼
        Create Community Report
                │
                ▼
           clientId assigned
                │
                ▼
          PENDING_REVIEW
                │
                ▼
            Moderation
           /          \
          /            \
         ▼              ▼
    VERIFIED         REJECTED
       │
       ▼
Public geographic queries
```

Only `VERIFIED` reports appear in geographic public queries.

---

# 📴 Offline-First Design

Offline capability is a major part of AI·FEWS.

The application uses:

```text
Service Worker
       +
IndexedDB
```

to preserve selected application functionality when connectivity is unavailable.

Stored information includes:

```text
Timestamped snapshots
Preparedness content
Community reports
Synchronization state
```

---

# 🔄 Offline Synchronization

When a user submits a report without connectivity:

```text
Create Report
     ↓
PENDING SYNC
     ↓
Internet restored
     ↓
SYNCING
     ↓
┌───────────────┐
│               │
▼               ▼
SYNCED        FAILED
```

The same client ID is retained across retry attempts.

This allows the server to recognize repeated synchronization attempts without treating every retry as a brand-new report.

---

# 🧭 Offline Data Philosophy

AI·FEWS deliberately separates:

```text
Cached information
        ≠
Current live information
```

The application does not cache API responses or map tiles and then present them as if they were current.

Instead, stored snapshots retain timestamp/freshness information.

---

# 🗺️ Maps & Offline Behavior

OpenStreetMap tiles are loaded for the visible map area.

They are **not prefetched for offline use**.

This means:

```text
Offline
  ↓
Application shell may remain available
  ↓
Previously stored application information may remain available
  ↓
Live map tiles are not guaranteed
```

---

# 📊 Trends

AI·FEWS includes an environmental trends module.

The purpose is to help users understand changes over time rather than looking only at one environmental observation.

Conceptually:

```text
Historical snapshots
        ↓
Temporal comparison
        ↓
Trend information
        ↓
User interpretation
```

Trend data should always be interpreted together with timestamps and provider freshness.

---

# 🧰 Preparedness

The application includes preparedness information intended to help users prepare for environmental hazards.

Examples include:

* Emergency planning
* Essential supplies
* Communication planning
* Safe movement
* Protecting important documents
* Monitoring official warnings
* Avoiding dangerous floodwater

AI·FEWS does not replace instructions from local authorities during an actual emergency.

---

# 🧪 Simulation

AI·FEWS includes a simulation module for controlled application scenarios.

Simulation output is explicitly separated from actual observations.

It does **not** become:

```text
❌ Live environmental data
❌ Historical observation
❌ Real trend data
❌ Official warning
```

This prevents simulated scenarios from being confused with real-world conditions.

---

# 🛰️ Advanced Environmental Data

The architecture provides placeholders for future providers including:

```text
Satellite
Terrain
Hydrology
Historical Floods
```

Until real providers are configured, these endpoints return:

```text
CONFIGURATION REQUIRED
```

This is intentional.

The application does not present placeholder data as genuine environmental observations.

---

# 🖥️ Application Screens

The route inventory is maintained in:

```text
public/manus-routes.json
```

Current application areas include:

```text
🏠 Dashboard
📍 Location
🌦️ Environment
🧠 Risk
⚠️ Alerts
🗺️ Map
👥 Community
📊 Trends
🧪 Data Quality
📚 Sources
🧰 Preparedness
🚨 Emergency Guidance
🎛️ Simulation
⭐ Saved Locations
🔔 Notifications
⚙️ Settings
🔐 Privacy Center
📜 Privacy Policy
ℹ️ About
```

---

# 🗂️ Project Structure

```text
aifews/
│
├── src/
│   ├── client/
│   │   ├── app/
│   │   │   └── App shell, shared components,
│   │   │       location context
│   │   │
│   │   ├── pages/
│   │   │   └── Route-level application screens
│   │   │
│   │   ├── services/
│   │   │   └── API, geolocation, notifications,
│   │   │       IndexedDB and synchronization
│   │   │
│   │   └── styles.css
│   │
│   ├── server/
│   │   ├── alerts/
│   │   │   └── Alert derivation and deduplication
│   │   │
│   │   ├── db/
│   │   │   └── MySQL migration runner,
│   │   │       pool and repository
│   │   │
│   │   ├── middleware/
│   │   │   └── Rate limits and request controls
│   │   │
│   │   ├── providers/
│   │   │   └── Open-Meteo and Nominatim adapters
│   │   │
│   │   ├── risk/
│   │   │   └── Canonical server-side risk heuristic
│   │   │
│   │   ├── routes/
│   │   │   └── REST API handlers
│   │   │
│   │   └── services/
│   │       └── Environment, simulation and
│   │           provider catalog/state
│   │
│   └── shared/
│       └── contracts.ts
│
├── db/
│   └── migrations/
│
├── public/
│   ├── manifest
│   ├── icons
│   ├── service worker
│   └── route manifest
│
├── scripts/
│   └── PWA precache generation and verification
│
├── tests/
│   ├── integration
│   ├── UI
│   ├── location
│   ├── risk
│   └── offline
│
├── android/
│   └── Capacitor Android source project
│
├── docs/
│   └── RELEASE_EVIDENCE.md
│
├── Dockerfile
├── capacitor.config.ts
├── plan.md
├── STORE_LISTING.md
├── .env.example
└── README.md
```

---

# 🔐 Security Architecture

AI·FEWS follows a server-authoritative architecture for sensitive operations.

### Browser

```text
UI
Location
Cached application data
User preferences
```

### Server

```text
Database credentials
Risk evaluation
Alert evaluation
Provider requests
Moderation authorization
Protected configuration
```

### Database

```text
Persistent application state
```

The frontend never receives the database connection string.

---

# 🛡️ Privacy by Design

AI·FEWS deliberately avoids placing protected configuration directly into the source repository.

Public legal information is supplied through protected runtime configuration.

If the minimum format requirements are not met:

```text
NOT CONFIGURED
```

is displayed.

The application does not silently substitute fake operator information.

---

# 📱 Android Identity

The current Android application ID is:

```text
com.ganavi.aifews
```

The Android project lives under:

```text
android/
```

The Android application uses the same web application and API architecture rather than implementing an independent backend.

---

# 🔬 Engineering Philosophy

AI·FEWS follows five core principles:

```text
1. Explain instead of exaggerate.
2. Fail safely when configuration is missing.
3. Distinguish cached information from live information.
4. Keep sensitive operations server-side.
5. Verify before claiming production readiness.
```

---

# 🌟 The Big Picture

AI·FEWS is more than a weather dashboard.

It combines:

```text
             🌦️ ENVIRONMENT
                   │
                   ▼
              📍 LOCATION
                   │
                   ▼
              🧠 ANALYSIS
                   │
                   ▼
              💡 EXPLANATION
                   │
                   ▼
               ⚠️ ALERT
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
    👥 COMMUNITY          🧰 PREPAREDNESS
        │                     │
        └──────────┬──────────┘
                   ▼
                🧑 USER
                   │
          ┌────────┴────────┐
          ▼                 ▼
       🌐 ONLINE         📴 OFFLINE
          │                 │
          └────────┬────────┘
                   ▼
              📱 AI·FEWS
```

The current system provides the application and engineering foundation for future validated environmental AI.

---

# 🚀 Next

Continue with **Part 2** below for:

* ⚙️ Requirements & environment configuration
* 🚀 Installation
* ▶️ Local development
* 🗄️ Database setup
* 📡 API inventory
* 🧪 Verification commands
* 📱 Android build
* 🔑 Release signing
* 📦 Google Play preparation
* 🛡️ Privacy/legal status
* 🚧 Release gates
* ⚠️ Known limitations
* 🤖 Future AI/ML roadmap
* 📸 Screenshot section
* 👩‍💻 Developer/project information
* 🏁 Final project vision

# ⚙️ Requirements & Configuration

## 🧰 Development Requirements

AI·FEWS currently uses:

* **Node.js 22**
* **pnpm 11.25.0**
* **TypeScript**
* **MySQL**
* **Capacitor**
* **Android Studio** for native Android builds

The WebDev build pins the package manager through Corepack:

```bash
corepack enable
corepack prepare pnpm@11.25.0 --activate
```

---

# 🔐 Environment Configuration

Managed production/Preview values are supplied through protected project environment configuration.

**Never commit secrets or production credentials to GitHub.**

### Environment variables

| Variable                     | Purpose                             | Location / Status                     |
| ---------------------------- | ----------------------------------- | ------------------------------------- |
| `DATABASE_URL`               | MySQL connection string             | Server only                           |
| `MODERATION_TOKEN`           | Privileged moderation authorization | Server only; currently not configured |
| `PUBLIC_OPERATOR_NAME`       | Public legal operator identity      | Protected runtime configuration       |
| `PUBLIC_OPERATOR_ADDRESS`    | Public operator postal address      | Protected runtime configuration       |
| `PUBLIC_SUPPORT_CONTACT`     | Support/privacy/deletion contact    | Protected runtime configuration       |
| `PORT`                       | HTTP listener port                  | Defaults to `3000` locally            |
| `NODE_ENV`                   | Runtime environment                 | Development / production              |
| `OPEN_METEO_FORECAST_URL`    | Weather provider URL                | Optional override                     |
| `OPEN_METEO_AIR_QUALITY_URL` | Air-quality provider URL            | Optional override                     |
| `NOMINATIM_REVERSE_URL`      | Reverse-geocoding URL               | Optional override                     |

`.env.example` contains placeholders only.

For local development:

```bash
cp .env.example .env
```

Then populate only the values required for your local environment.

### 🚨 Never commit

```text
.env
.env.local
.env.production
database passwords
API secrets
Firebase private keys
service-account files
Android keystores
signing credentials
```

---

# 🚀 Installation

Clone the repository:

```bash
git clone https://github.com/ganavi8/aifews.git
cd aifews
```

Enable Corepack:

```bash
corepack enable
```

Activate the required pnpm version:

```bash
corepack prepare pnpm@11.25.0 --activate
```

Install dependencies:

```bash
pnpm install --frozen-lockfile
```

---

# ▶️ Run Locally

Start the development server:

```bash
pnpm dev
```

The development server runs Express with Vite middleware.

Default listener:

```text
http://localhost:3000
```

The health endpoint is:

```text
GET /api/health
```

The service should not be considered ready until:

```text
Database connection
        +
Migrations
        +
Application startup
```

have completed successfully.

---

# 🗄️ Database Setup

AI·FEWS uses managed MySQL persistence.

Database migrations are located in:

```text
db/migrations/
```

Current ordered migrations include:

```text
0001_platform.sql
0002_assessment_idempotency_opt_in_defaults.sql
```

Run migrations:

```bash
pnpm db:migrate
```

Check the database:

```bash
pnpm db:check
```

### ⚠️ Important

`pnpm db:check` is **not a read-only health check**.

It performs isolated temporary database writes and reads to verify:

* Migration integrity
* Assessment idempotency
* Alert persistence
* Notification defaults
* Community-report idempotency
* Preference persistence
* Database connectivity

It attempts to remove its test fixtures afterward.

A failed cleanup should be treated as an issue that must be investigated before continuing.

---

# 🔌 API Architecture

All application APIs are mounted under:

```text
/api/*
```

The frontend does **not** communicate directly with MySQL.

Instead:

```text
Browser / Android
       │
       ▼
   Express API
       │
       ▼
   MySQL Repository
```

The API uses:

* Zod request/response validation
* Bounded inputs
* Structured errors
* Rate limits
* Server-side provider adapters
* `Cache-Control: no-store` for dynamic responses

---

# 📡 API Inventory

## Health / Configuration

```text
GET /api/health
GET /api/public-config
GET /api/data-quality
GET /api/providers
GET /api/models
```

---

## Location / Environment

```text
GET /api/location
GET /api/weather
GET /api/rainfall
GET /api/air-quality
GET /api/environment
GET /api/risk
GET /api/risk/explain
```

---

## Trends / Alerts / Notifications

```text
GET /api/trends
GET /api/alerts
GET /api/notifications

PUT /api/notifications/preferences
```

---

## Community

```text
GET /api/community-reports
POST /api/community-reports
POST /api/sync

PATCH /api/community-reports/:id/moderation
```

Geographic community queries support parameters such as:

```text
lat
lon
radiusKm
```

---

## Saved Locations

```text
GET /api/saved-locations
POST /api/saved-locations

PATCH /api/saved-locations/:id
DELETE /api/saved-locations/:id
```

Saved locations are scoped to the installation.

---

## Simulation / Advanced Providers

```text
GET /api/simulation
GET /api/satellite
GET /api/terrain
GET /api/hydrology
GET /api/historical-floods
```

Advanced provider endpoints remain configuration-gated until genuine providers are connected.

---

# 🧠 Risk Engine

The current production architecture uses:

```text
RuleBasedHeuristic-v1.0
```

This is a transparent server-side rainfall screening heuristic.

It is intentionally explainable.

The system does **not** currently claim:

```text
❌ Trained flood prediction model
❌ Validated flood probability
❌ Confidence score
❌ Flood prediction accuracy metric
```

Insufficient environmental input produces:

```text
UNKNOWN
```

rather than inventing a risk result.

---

# ⚠️ Risk Interpretation

A risk result should be interpreted as environmental decision-support information.

Conceptually:

```text
Environmental Inputs
        │
        ▼
Input Validation
        │
        ├── Insufficient → UNKNOWN
        │
        ▼
RuleBasedHeuristic-v1.0
        │
        ▼
Risk Assessment
        │
        ▼
Explanation
        │
        ▼
Alert Evaluation
```

The system does not represent its risk output as an official government flood warning.

---

# 🔔 Notification Architecture

Notification categories default to **disabled** until an installation explicitly saves its preferences.

There are separate concepts for:

```text
Server notification preference
        +
Device notification permission
        +
Local user opt-in
```

This prevents the system from assuming notification permission simply because an application is installed.

The current application can attempt device-local display after a persisted alert is encountered during refresh.

### Current limitation

Remote background push delivery has **not been verified across physical Android devices and browser runtimes**.

Therefore:

```text
Alert persistence       ✅
Notification preferences ✅
Local alert handling     ✅
Remote push delivery     🚧 Verification/configuration required
```

---

# 👥 Community Report Lifecycle

Community reports use a stable:

```text
clientId
```

Reports are initially stored as:

```text
PENDING_REVIEW
```

Only:

```text
VERIFIED
```

reports are exposed through geographic public queries.

Simplified lifecycle:

```text
User
 │
 ▼
Create Report
 │
 ▼
PENDING_REVIEW
 │
 ▼
Moderation
 │
 ├──────────────┐
 ▼              ▼
VERIFIED      REJECTED
 │
 ▼
Public Geographic Query
```

---

# 🔐 Moderation Security

Moderator actions require the server-only:

```text
MODERATION_TOKEN
```

The credential is currently not configured.

Therefore moderator operations fail safely with:

```text
MODERATION_NOT_CONFIGURED
```

rather than becoming available to ordinary users.

The moderation credential must be supplied through the secure server environment before moderation is enabled.

---

# 📴 Offline Architecture

AI·FEWS follows an offline-first strategy for selected application functionality.

The service worker caches:

```text
Application shell
Versioned assets
```

IndexedDB stores:

```text
aifews-offline
```

including:

```text
Timestamped snapshots
Community reports
Preparedness content
Queued synchronization state
```

---

# 🔄 Offline Synchronization

Community reports retain their original client ID across retries.

The lifecycle is:

```text
                  OFFLINE
                     │
                     ▼
              Create Report
                     │
                     ▼
               PENDING SYNC
                     │
              Internet returns
                     │
                     ▼
                  SYNCING
                  /      \
                 /        \
                ▼          ▼
             SYNCED      FAILED
```

The server confirms synchronization before the local record is considered successfully synchronized.

---

# 🌐 What Is NOT Cached

AI·FEWS deliberately does **not** treat stale information as current truth.

The following are not cached as authoritative current information:

```text
❌ Dynamic API responses
❌ Current weather API results
❌ Current risk API results
❌ OpenStreetMap map tiles
```

The application instead uses cached application resources and timestamped snapshots.

This distinction is important for environmental applications where stale information could be misleading.

---

# 🗺️ Maps

OpenStreetMap tiles are requested only for the visible map area.

They are **not prefetched for offline use**.

This keeps the offline architecture explicit rather than pretending the complete map remains available without connectivity.

---

# 🧪 Verification & Testing

Run the complete project verification:

```bash
pnpm typecheck
```

Run tests:

```bash
pnpm test
```

Build the web application:

```bash
pnpm build:web
```

Build the server:

```bash
pnpm build:server
```

Run the complete build pipeline:

```bash
pnpm build
```

---

# 🌍 Provider Verification

Run:

```bash
pnpm verify:providers
```

This performs live, read-only requests against configured public providers.

It verifies provider availability and reports metadata such as:

```text
Provider
HTTP status
Freshness
Availability
```

Provider credentials are not logged.

---

# 📱 Android Build

Synchronize the web application with Capacitor:

```bash
pnpm android:sync
```

This performs:

```text
Web build
    ↓
Capacitor synchronization
    ↓
Android project update
```

### Important

`pnpm android:sync` does **not** prove that:

* Android SDK is configured
* JDK is configured
* Gradle build succeeds
* APK installation succeeds
* AAB signing works
* FCM works on a physical device

These require native Android verification.

---

# 🏗️ Android Release Build

The application ID is:

```text
com.ganavi.aifews
```

The release workflow is:

```text
React / TypeScript
       ↓
Vite production build
       ↓
Capacitor sync
       ↓
Android Gradle project
       ↓
Release signing
       ↓
AAB
       ↓
Google Play Console
```

Build command:

```bash
pnpm android:bundle
```

This requires a properly configured Android SDK, JDK, Gradle environment, and release signing credentials.

---

# 🔑 Android Signing

Release signing credentials must never be committed.

Recommended ignored files:

```gitignore
*.jks
*.keystore
key.properties
```

The signing key should be backed up securely.

The Android application ID must also be confirmed by the publisher before distribution.

---

# 📦 Google Play Status

AI·FEWS is **not currently represented as published on Google Play**.

The repository contains:

```text
STORE_LISTING.md
```

which contains draft Play Store metadata and data-safety information.

This is documentation for preparation and does not itself constitute a Play Store submission.

Before publishing:

```text
[ ] Confirm application identity
[ ] Confirm package ID
[ ] Configure release signing
[ ] Build signed AAB
[ ] Test on physical Android device
[ ] Verify notification behavior
[ ] Review privacy policy
[ ] Complete Data Safety declaration
[ ] Complete store listing
[ ] Perform production release checks
```

---

# 🛡️ Privacy & Legal

The public privacy policy is available at:

```text
/privacy-policy
```

The policy uses protected runtime configuration for:

```text
Operator name
Operator postal address
Support/privacy contact
```

These values are intentionally not embedded in the repository.

The application performs minimum format validation.

If the protected configuration does not satisfy those checks, the public policy displays:

```text
NOT CONFIGURED
```

instead of publishing incomplete or placeholder information.

---

# ⚖️ Legal Configuration Status

The application should not be presented as legally production-ready until the operator has:

```text
[ ] Confirmed operator identity
[ ] Confirmed postal address
[ ] Confirmed support/privacy contact
[ ] Reviewed privacy policy
[ ] Reviewed jurisdiction-specific requirements
[ ] Reviewed data-handling practices
[ ] Reviewed Play Store declarations
```

The repository does not contain the protected legal values.

---

# 🚧 Release Status

## Release Assessment — 30 September 2026

> **NOT YET PRODUCTION-READY**

The application source and managed MySQL Preview are available.

However, production publication remains gated by configuration and verification requirements.

### Current status

| Area                                | Status                        |
| ----------------------------------- | ----------------------------- |
| React frontend                      | ✅ Implemented                 |
| Express backend                     | ✅ Implemented                 |
| Shared Zod contracts                | ✅ Implemented                 |
| MySQL persistence                   | ✅ Implemented                 |
| Risk engine                         | ✅ Implemented                 |
| Alert persistence                   | ✅ Implemented                 |
| Community reports                   | ✅ Implemented                 |
| Moderation architecture             | 🟡 Credential required        |
| PWA                                 | ✅ Implemented                 |
| IndexedDB offline storage           | ✅ Implemented                 |
| Offline report queue                | ✅ Implemented                 |
| Android source project              | ✅ Implemented                 |
| Android release build               | 🟡 Toolchain/signing required |
| Physical Android testing            | 🟡 Required                   |
| Remote push/background notification | 🟡 Not verified               |
| Public legal configuration          | 🟡 Owner review required      |
| Production publication              | ⏳ Pending release gates       |
| Google Play publication             | ⏳ Not published               |

---

# 📋 Release Gates

Before production publication, the following should be completed:

```text
[ ] Owner-approved public operator details
[ ] Legal/privacy review
[ ] Valid support contact
[ ] Moderation credential configured
[ ] Production database verified
[ ] Production migrations verified
[ ] Provider checks successful
[ ] Risk behavior verified
[ ] Alert behavior verified
[ ] Offline synchronization verified
[ ] Android SDK configured
[ ] JDK configured
[ ] Release signing configured
[ ] AAB successfully generated
[ ] Physical Android device tested
[ ] Notification permission tested
[ ] FCM/device delivery tested
[ ] Production deployment successful
[ ] Live health checks successful
[ ] Final release evidence recorded
```

---

# 📑 Release Evidence

Detailed release information is maintained in:

```text
docs/RELEASE_EVIDENCE.md
```

This document should be treated as the source of truth for:

* Feature verification
* Platform verification
* Test results
* Deployment state
* Unresolved release gates
* Production readiness evidence

A Git commit alone is **not** considered proof of deployment.

Likewise:

```text
Local build
     ≠
Preview
     ≠
Production deployment
     ≠
Production verification
```

---

# ⚠️ Known Limitations

## 1. No Validated Flood Prediction Model

The current risk system is a transparent heuristic.

It is not yet a validated machine-learning flood forecasting model.

---

## 2. No Flood Probability

AI·FEWS does not currently claim a statistically validated probability such as:

```text
"83% chance of flooding"
```

Such a value would require an appropriately trained and validated model.

---

## 3. No Accuracy Claim

The current implementation does not claim:

```text
Flood prediction accuracy
Model confidence
ROC-AUC
F1 score
Forecast probability
```

for the production risk engine.

---

## 4. Advanced Data Providers Not Configured

The following currently remain configuration-gated:

```text
Satellite
Terrain
Hydrology
Historical flood data
```

Until genuine providers are configured, these endpoints return:

```text
CONFIGURATION REQUIRED
```

---

## 5. Offline Data Can Become Stale

Offline mode does not magically generate new weather information.

When the device has no connectivity:

```text
No new external provider data
        ↓
Use previously stored information
```

Therefore cached environmental information must be interpreted with its timestamp/freshness metadata.

---

## 6. Notification Delivery Is Not Guaranteed

The application does not claim guaranteed:

```text
Background delivery
Remote push delivery
Cross-browser notification delivery
```

until these behaviors have been verified on supported platforms.

---

# 🔮 Future AI / ML Roadmap

The current rule-based architecture provides a foundation for future machine-learning research.

A future AI·FEWS version could combine:

```text
Rainfall
   +
Weather Forecast
   +
Satellite Imagery
   +
Terrain
   +
Drainage Networks
   +
Water Levels
   +
Historical Flood Events
   +
Community Reports
```

to produce richer spatiotemporal environmental intelligence.

---

# 🛰️ Potential Future Data Sources

Future integrations could include:

* NASA GPM IMERG
* Sentinel-1 SAR
* Sentinel-2
* Digital Elevation Models
* OpenStreetMap drainage networks
* Government rainfall observations
* River/water-level sensors
* Historical flood datasets

These integrations should only be represented as active capabilities after actual provider integration and validation.

---

# 🤖 Potential Future Models

Future research could evaluate models such as:

```text
LSTM
BiGRU
ConvLSTM
CNN
Temporal Transformer
Graph Neural Network
Spatiotemporal Transformer
```

A possible future architecture:

```text
               MULTIMODAL INPUT
                      │
       ┌──────────────┼──────────────┐
       ▼              ▼              ▼
   Rainfall       Satellite       Terrain
       │              │              │
       └──────────────┼──────────────┘
                      ▼
             Feature Engineering
                      │
                      ▼
             Spatiotemporal Model
                      │
                      ▼
              Flood Risk Output
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
     Risk Map                Explanation
          │                       │
          └───────────┬───────────┘
                      ▼
                 AI·FEWS App
```

---

# 🌍 Long-Term Vision

AI·FEWS is intended to evolve from an environmental awareness application into a broader:

> **Explainable, multimodal, location-aware environmental intelligence platform.**

The long-term architecture can combine:

```text
🌦️ Weather
🌧️ Rainfall
🛰️ Satellite data
🗺️ Terrain
🌊 Hydrology
👥 Community observations
🧠 Machine learning
📍 Location intelligence
📱 Mobile notifications
📴 Offline-first design
```

into a unified environmental decision-support system.

---

# 🎯 Engineering Principles

AI·FEWS follows several important engineering principles:

### 1. Server-side authority

Risk and alert evaluation remain server-controlled.

### 2. Explainability

The current heuristic is transparent rather than presenting unexplained AI outputs.

### 3. Fail closed

Missing protected configuration does not silently become an enabled feature.

### 4. Explicit uncertainty

Insufficient input can produce:

```text
UNKNOWN
```

instead of fabricated certainty.

### 5. Offline honesty

Cached information is not presented as live information.

### 6. Privacy by design

Secrets and protected legal configuration remain outside the client bundle.

### 7. Verification before release

Implemented functionality is not automatically considered production-ready until it is tested in its target environment.

---

# 📸 Screenshots

Add screenshots of the **actual current application** here.

Recommended gallery:

```text
docs/screenshots/
├── dashboard.png
├── environment.png
├── risk.png
├── alerts.png
├── map.png
├── community.png
├── trends.png
├── preparedness.png
├── offline-mode.png
└── android.png
```

Then add them to the README:

```markdown
## 🖥️ Application Preview

### Dashboard

![AI·FEWS Dashboard](docs/screenshots/dashboard.png)

### Risk Assessment

![AI·FEWS Risk](docs/screenshots/risk.png)

### Alerts

![AI·FEWS Alerts](docs/screenshots/alerts.png)

### Community Reports

![AI·FEWS Community](docs/screenshots/community.png)

### Android Application

![AI·FEWS Android](docs/screenshots/android.png)
```

Only add screenshots that represent the current implementation.

---

# 📂 Important Documentation

| File                       | Purpose                               |
| -------------------------- | ------------------------------------- |
| `README.md`                | Main project documentation            |
| `docs/RELEASE_EVIDENCE.md` | Release verification and gates        |
| `STORE_LISTING.md`         | Play Store metadata/data-safety draft |
| `plan.md`                  | Rebuild plan and acceptance criteria  |
| `.env.example`             | Environment configuration template    |

---

# 🌐 Project

## Live Application

**AI·FEWS**

```text
https://aifews-mwbcgb9q.manus.space
```

> The public URL and deployed feature set may change during development and release preparation.

---

# 💻 Repository

**GitHub**

```text
https://github.com/ganavi8/aifews
```

---

# 👩‍💻 Developer

**Ganavi V C**

Artificial Intelligence & Machine Learning

Kalpataru Institute of Technology

India

---

# 🏁 Final Project Summary

AI·FEWS brings together:

```text
        🌧️ Environmental Data
                 │
                 ▼
          📍 Location Context
                 │
                 ▼
          🧠 Risk Assessment
                 │
                 ▼
           ⚠️ Alert Engine
                 │
        ┌────────┴────────┐
        ▼                 ▼
   📊 Dashboard       🔔 Alerts
        │                 │
        └────────┬────────┘
                 ▼
          🧑 User Action
                 │
        ┌────────┴────────┐
        ▼                 ▼
     📴 Offline         📱 Android
        │                 │
        └────────┬────────┘
                 ▼
          🌍 AI·FEWS
```

The project is intentionally designed around **transparent risk assessment, explicit uncertainty, offline resilience, privacy-conscious architecture, and verifiable release gates**.

The current system is a decision-support platform rather than a certified flood forecasting service. Future versions can extend the architecture with validated multimodal machine-learning models, satellite observations, terrain information, hydrological data, and larger-scale environmental intelligence.

---

# ⭐ Project Vision

> **Detect environmental change. Explain risk clearly. Help people prepare. Keep essential information accessible when connectivity is limited.**

**AI·FEWS — toward accessible, explainable, location-aware environmental intelligence.**

---

## 📌 Current Release Principle

```text
IMPLEMENTED
     ↓
CONFIGURED
     ↓
TESTED
     ↓
DEPLOYED
     ↓
VERIFIED
     ↓
PRODUCTION READY
```

A feature is not considered fully released merely because its source code exists.

Production status requires successful configuration, deployment, platform testing, and verification.

---

### 📜 License

If this repository is intended to be open source, add the selected license here.

For example:

```text
MIT License
```

Only use the MIT designation after adding an actual `LICENSE` file containing the MIT license text.

---

