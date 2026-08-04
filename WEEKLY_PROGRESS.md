# CrisisConnect — Weekly Build Log

How the project progressed, week by week — from design (Week 5) through the
**final, tested, and deployed application (Week 13)**. The app is now live on the
web and fully feature-complete.

---

## Week 5 — Design & scope lock ✅
- **ERD** (`docs/erd/erd.svg`), **PostgreSQL schema** (`backend/db/schema.sql`),
  **API contract**, and **wireframes** (`docs/wireframes/`).

## Week 6 — Core foundation ✅
- **Auth & access control** — JWT login/register/`/me`, bcrypt passwords, and
  `requireAuth` / `requireRole` guards on every protected route.
- **Three role dashboards** — citizen, volunteer, and admin, each behind
  role-based routing (`ProtectedRoute`, `AuthContext`).
- A polished split-screen **login/register** with one-tap demo accounts.

## Week 7 — Incident map ✅
- Interactive **Leaflet + OpenStreetMap/CARTO** crisis map (`CrisisMap.jsx`):
  custom **severity-coloured incident pins** (critical pins pulse), **shelter
  markers** with live bed counts, popups, severity filters, auto-fit bounds.
- Shown on the citizen map page and the admin overview/incidents pages.

## Week 8 — Midterm MVP ✅  (the milestone this build delivers)
- **The full loop, on a real database:** a citizen submits a request → an
  **administrator manually reviews and assigns** a volunteer → the volunteer
  **accepts → starts → completes** → the request resolves. Verified end-to-end.
- **Real PostgreSQL** — the backend runs on **PGlite (embedded PostgreSQL)**, so
  the app uses a genuine Postgres database (schema, constraints, the generated
  `available_beds` column, transactions) with **no server to install**. It applies
  `schema.sql` + `seed.sql` and seeds demo users/requests on first start.
- **Admin triage** — requests are reviewed, prioritised, and assigned by the
  admin. The `ai_*` / `priority_score` columns are populated by the Week 9 AI
  layer (below).
- Shelters and incidents are **read-only** views in this milestone.

## Week 9 — AI layer + live data ingestion ✅
- **AI auto-triage** — every incoming citizen request is automatically scored for
  urgency the moment it is submitted, filling the `priority_score`, `ai_category`,
  and `ai_summary` columns. The admin **Request queue** is ordered by priority so
  the most urgent needs rise to the top, each with a one-line AI summary. Scoring
  uses **Claude (Haiku)** through a structured tool call, guided by an explicit
  rubric, with a deterministic keyword-heuristic fallback so it runs offline and a
  request is **never** blocked from saving. Human-in-the-loop: the score is only a
  suggestion; an administrator still reviews, assigns, and resolves every request.
- **Live incident ingestion** — a resilient ingestion framework pulls incidents
  from official public sources and UPSERTs them by `(source, external_id)`, so a
  re-fetch updates rather than duplicates. Runs on server boot, on a periodic
  timer, and on demand via an admin-only **Refresh feeds** button. Each source is
  isolated, so one failing feed (or no internet) never breaks the others.
- **All seven official B.C. feeds are live** (Weeks 9–10 ingestion): earthquakes
  (**USGS**), wildfires (**BC Wildfire Service** — significant active fires only),
  weather alerts (**Environment Canada** GeoMet `weather-alerts`), air quality
  (**AQHI**, high-risk only), floods (**BC River Forecast Centre**, grouped by
  basin), road events (**DriveBC** Open511, significant only), and evacuation
  orders/alerts (**EmergencyInfoBC**). Every point is filtered to inside British
  Columbia (point-in-polygon). Feed incidents arrive as `pending` for an
  administrator to verify (verification is the remaining Week 10 step).

## Week 10 — Verification, de-duplication, shelters & notifications ✅
- **Admin verification** of incidents, with a "visible-vs-verified" model: trusted
  official feeds show immediately, while citizen-reported incidents stay hidden
  until an administrator verifies them. Admins can verify, dismiss, or restore.
- **Cross-source de-duplication** — the same event arriving from different sources
  is detected (same type, within a short distance) and merged into a single
  canonical incident. Reversible (unmerge), and re-runs after every feed refresh.
- **Create-incident-from-request** — an admin can promote a citizen request into a
  new incident and link them.
- **Shelter management** — live occupancy/capacity, open/full/closed status,
  one-click placement of a citizen into a bed, and automatic capacity alerts.
- **In-app notifications** — a sidebar bell with unread counts, driven by request,
  assignment, verification, and shelter-capacity events.

## Week 11 — Analytics & attachments ✅
- **Insights dashboard** — impact and performance metrics (open requests,
  resolution rate, average time to assign/resolve, live incidents, shelter
  occupancy), a 14-day request trend chart, and **CSV / PDF export**.
- **Photo attachments** — citizens can attach photos to a request; responders view
  them in a lightbox from the request detail.

## Week 12 — Accounts, volunteer verification & automated tests ✅
- **Richer registration + profile page** — volunteers register with skills,
  certifications, and vehicle availability; every user has a profile to edit their
  details and change their password.
- **Admin volunteer verification** — admins review and verify volunteers before
  they can be assigned, closing the volunteer-coordination loop.
- **Automated test suite** — 28 tests (Jest + Supertest): unit tests for the AI
  triage logic and integration tests over the real HTTP API (auth, volunteer
  verification, request lifecycle). Run with `cd backend && npm test`.
- UI polish, accessibility passes, and bug fixes throughout.

## Week 13 — Deployment & final defense ✅
- **Deployed to the cloud (Render)** — the database, API, and React frontend each
  run as their own service, on a **hosted PostgreSQL** (the backend switches from
  embedded PGlite to a real Postgres server with a single flag). Auto-redeploys on
  every push. See `DEPLOYMENT.md` and `render.yaml`.
- Added a `db:reset` script to restore clean demo data, plus documented env files.
- **Final defense** — presentation deck, live end-to-end demo, and speaker script.

---

## Status — COMPLETE ✅
- **Live on the web:** https://crisisconnect-web.onrender.com
- Feature-complete through the Week 13 final defense, **tested** (28 automated
  tests) and **deployed**.
- Also runs locally with zero setup via `npm run dev` in both `backend` and
  `frontend` (embedded PostgreSQL, no install, no API key needed) — see `README.md`.
