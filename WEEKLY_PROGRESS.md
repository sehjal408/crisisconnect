# CrisisConnect — Weekly Build Log

How the project progressed, week by week. This build delivers the
**Week 8 "Midterm MVP"** milestone plus the **Week 9 AI auto-triage layer**.
Weeks 10–13 are listed at the end as the planned remaining work (not built yet).

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

## Week 9 — AI auto-triage ✅
- **AI logic layer** — every incoming citizen request is automatically scored for
  urgency the moment it is submitted, filling the `priority_score`, `ai_category`,
  and `ai_summary` columns. The admin **Request queue** is ordered by priority so
  the most urgent needs rise to the top, each with a one-line AI summary.
- **Real model + safe fallback** — scoring uses **Claude (Haiku)** through a
  structured tool call, guided by an explicit rubric. If there is no API key, no
  network, or the call errors/times out, it falls back to a deterministic keyword
  heuristic, so a request is **never** blocked from saving — the app still runs
  fully offline this way.
- **Human-in-the-loop** — the AI output is only a suggestion. An administrator
  still reviews, assigns, and resolves every request; the AI never dispatches.

### Scope note — intentionally NOT in this build (Weeks 10–13)
To stay true to the timeline, these remain planned:
- **Week 10** — live data-source ingestion from official B.C. feeds, feed
  de-duplication & admin verification; shelter occupancy management, low-stock
  alerts, notifications.
- **Week 11** — analytics charts, impact metrics, PDF/CSV export, automated tests,
  hosted deployment.
- **Week 12** — QA & demo polish.
- **Week 13** — final defense.

---

## Status
- Runs today on a real (embedded) PostgreSQL database via `npm run dev` in both
  `backend` and `frontend` — see `README.md`.
- Delivered through the Week 9 AI auto-triage milestone; Weeks 10–13 are the
  planned next steps above.
