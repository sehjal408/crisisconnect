# CrisisConnect

**AI-assisted community crisis awareness & volunteer coordination for British Columbia.**

CrisisConnect pulls B.C.'s scattered emergency information into one live map, lets
citizens request help, uses AI to triage the most urgent needs, and coordinates
verified volunteers from request all the way to resolution — with a human always
making the final call.

🔗 **Live app:** https://crisisconnect-web.onrender.com
*(hosted on a free tier — the first load may take ~30–60s while the server wakes up)*

> Built by **Team SkillSpark** — Balraj Singh, Sehjalpreet Kaur, Aarti Pandya —
> as a full-stack applied research project at Douglas College (CSIS 4495).

---

## Try it in 30 seconds

Open the [live app](https://crisisconnect-web.onrender.com) and sign in with a
one-tap demo account:

| Role       | Email                       | Password       |
|------------|-----------------------------|----------------|
| Admin      | admin@crisisconnect.ca      | `Password123!` |
| Volunteer  | volunteer@crisisconnect.ca  | `Password123!` |
| Citizen    | citizen@crisisconnect.ca    | `Password123!` |

**Follow the full loop:** submit a request as the **citizen** → watch the **AI**
rank it by urgency → review, verify, and assign a volunteer as the **admin** →
accept and complete the job as the **volunteer** → see it all measured on the
insights dashboard.

---

## What it does

**🗺️ One live crisis map**
Real incidents from **seven official B.C. public feeds**, filtered to inside the
province and refreshed automatically — earthquakes (USGS), wildfires (BC Wildfire
Service), weather alerts (Environment Canada), air quality (AQHI), floods (B.C.
River Forecast Centre), road events (DriveBC / Open511), and evacuation
orders/alerts (EmergencyInfoBC). Severity-coloured pins, shelter layer with live
bed counts, and type icons at a glance.

**🤖 AI auto-triage (human-in-the-loop)**
Every incoming request is scored for urgency the moment it's submitted, using
**Claude (Haiku)** through a structured, rubric-guided tool call — with a
deterministic keyword fallback so triage still works offline and a request is
*never* blocked from saving. The admin queue sorts itself so the most urgent needs
rise to the top, each with a one-line AI summary. **The AI only suggests; an
administrator always reviews, assigns, and resolves.**

**🧹 Cross-source de-duplication & verification**
The same event arriving from different feeds is detected and merged into one
canonical incident (reversible). Trusted official feeds show immediately; citizen
reports stay hidden until an admin verifies them — fast for real emergencies, safe
against noise.

**🧑‍🚒 Volunteer coordination**
Volunteers register with skills, certifications, and vehicle availability. Admins
verify them before they can be assigned, then match the right person to the right
job. Volunteers accept → start → complete, and the requester is updated at every
step.

**🏠 Shelter management**
Live occupancy and capacity, open/full/closed status, one-click placement of a
citizen into a bed, and automatic alerts when a shelter nears capacity.

**🔔 Notifications & 📊 insights**
In-app notifications for requests, assignments, verifications, and shelter events.
An analytics dashboard tracks resolution rate, average time to assign/resolve,
live-incident and shelter metrics, and a 14-day request trend — exportable to
**CSV / PDF**. Citizens can also attach **photos** to a request.

---

## Tech stack

| Layer      | Stack |
|------------|-------|
| Frontend   | React 19 · Vite · Tailwind CSS v4 · React Router · Leaflet (OpenStreetMap / CARTO) |
| Backend    | Node.js · Express · JWT auth · bcrypt · Multer (uploads) |
| Database   | PostgreSQL — **PGlite** (embedded Postgres, zero-install) in dev → hosted Postgres in prod |
| AI         | Claude (Haiku) structured tool calls, with an offline heuristic fallback |
| Testing    | Jest + Supertest — 28 automated tests (unit + API integration) |
| Deployment | Render (database, API, and frontend as separate services; auto-deploy on push) |

---

## Run it locally

No database to install and **no API key required** — the backend runs on
**PGlite** (real PostgreSQL compiled to WebAssembly), auto-applies the schema, and
seeds demo data on first start. Needs **Node.js 18+**.

```bash
# 1) Backend  (API + embedded PostgreSQL)
cd backend
npm install
npm run dev            # http://localhost:4000

# 2) Frontend
cd ../frontend
npm install
npm run dev            # http://localhost:5173
```

Then open http://localhost:5173 and sign in with any demo account above.

**Run the tests:**

```bash
cd backend
npm test               # 28 Jest + Supertest tests
```

**Use a standalone PostgreSQL server instead** (optional): set `DB_DRIVER=pg` plus
the `PG*` vars in `backend/.env`, then `npm run seed`. The app code is identical.
To restore clean demo data at any time: `npm run db:reset`.

---

## Project structure

```
frontend/  React 19 + Vite + Tailwind + React Router + Leaflet
  src/api/services.js    service layer (real API, with demo fallback)
  src/components/        design system (ui.jsx), AppShell, CrisisMap, modals
  src/pages/             auth, citizen/*, volunteer/*, admin/*

backend/   Node.js + Express + JWT + bcrypt
  src/config/db.js       PGlite (embedded Postgres) by default; pg server optional
  src/config/init.js     applies schema + seed on first boot
  src/routes, src/controllers, src/middleware, src/services (AI triage, feeds)
  db/schema.sql, db/seed.sql
  tests/                 Jest + Supertest
```

---

## Design

A calm, spacious, Apple-inspired interface — soft depth and glass surfaces, a
navy→teal brand, and consistent rounded cards — driven by a single design system
(`src/components/ui.jsx`). The map uses Leaflet with a clean CARTO basemap and
custom severity pins.

See **[WEEKLY_PROGRESS.md](WEEKLY_PROGRESS.md)** for the week-by-week build log and
**[DEPLOYMENT.md](DEPLOYMENT.md)** for how it's deployed.
