# CrisisConnect — Weekly Build Log

How the project progressed, week by week. This build is delivered to the
**Week 8 "Midterm MVP"** milestone — and stops there on purpose. Weeks 9–13 are
listed at the end as the planned remaining work (not built yet).

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
- **Manual triage** — requests are reviewed and prioritised by the admin. The
  `ai_*` / `priority_score` columns exist in the schema but are left for the
  Week 9 AI layer to populate.
- Shelters and incidents are **read-only** views in this milestone.

### Scope note — intentionally NOT in this build (Weeks 9–13)
To stay true to the timeline, these were deliberately left out:
- **Week 9** — AI logic layer (LLM severity/classification/priority) + start of
  live data-source ingestion.
- **Week 10** — remaining live feeds + de-duplication & admin verification;
  shelter occupancy management, low-stock alerts, notifications.
- **Week 11** — analytics charts, impact metrics, PDF/CSV export, automated tests,
  hosted deployment.
- **Week 12** — QA & demo polish.
- **Week 13** — final defense.

---

## Status
- Runs today on a real (embedded) PostgreSQL database via `npm run dev` in both
  `backend` and `frontend` — see `README.md`.
- Delivered exactly to the Week 8 midterm milestone; Weeks 9–13 are the planned
  next steps above.
