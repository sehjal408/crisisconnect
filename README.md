# CrisisConnect

AI-assisted community crisis awareness & volunteer coordination for British Columbia.
**Team SkillSpark** · CSIS 4495 · Douglas College.

A full-stack web app that brings B.C.'s scattered emergency information into one
live map, lets citizens request help, lets an administrator triage and assign, and
lets volunteers respond. Built to the **Week 8 "Midterm MVP"** scope: the full
citizen → triage → assignment → resolution loop, running on a real PostgreSQL
database. *(AI auto-triage is the Week 9 layer; live external feeds, notifications,
analytics and shelter management are Weeks 9–13 — intentionally not in this build.)*

---

## Run it (uses a real PostgreSQL database — no install needed)

The backend runs on **PGlite — real PostgreSQL embedded in Node** (the actual
Postgres engine compiled to WebAssembly). It applies `db/schema.sql`, seeds demo
data on first start, and persists to `backend/.pgdata`. **No database to install.**

```bash
# 1) Backend  (embedded PostgreSQL — auto-creates schema + demo data)
cd backend
npm install
npm run dev            # API + database on http://localhost:4000

# 2) Frontend
cd ../frontend
npm install
npm run dev            # http://localhost:5173 — talks to the API/database
```

Sign in with a one-tap demo account on the login screen, or:

| Role       | Email                       | Password       |
|------------|-----------------------------|----------------|
| Admin      | admin@crisisconnect.ca      | `Password123!` |
| Volunteer  | volunteer@crisisconnect.ca  | `Password123!` |
| Citizen    | citizen@crisisconnect.ca    | `Password123!` |

Try the loop: submit a request as the citizen → review & assign a volunteer as the
admin → accept and complete it as the volunteer. Every action reads/writes the
PostgreSQL database through the Express API.

**Use a normal PostgreSQL server instead** (optional): set `DB_DRIVER=pg` plus the
`PG*` vars in `backend/.env`, run `psql -f db/schema.sql && psql -f db/seed.sql`,
then `npm run seed`. The app code is identical.

**No backend running?** The frontend automatically falls back to a built-in demo
data layer so the UI still works for a quick look. Force it with `VITE_API=demo`.

---

## What's in it (Week 8 scope)

- **Citizen** — live crisis map (incidents + open shelters) with severity filters,
  one-tap "Request assistance", and a "My requests" tracker.
- **Volunteer** — availability toggle, skills, and an assignment list they accept,
  start, and complete.
- **Admin** — operations overview (live stats + map), the **request queue** with
  manual review and volunteer assignment, plus read-only **shelter** and
  **incident** views.

---

## Architecture

```
frontend/  React 19 + Vite + Tailwind v4 + React Router + Leaflet
  src/lib/meta.js        domain labels, colours, helpers
  src/api/services.js    service layer — real API, with demo fallback
  src/data/demo.js       in-browser fallback data (used only if the API is down)
  src/components/        design system (ui.jsx), AppShell, CrisisMap, RequestModal
  src/pages/             auth, citizen/*, volunteer/*, admin/*

backend/   Node.js + Express + JWT + bcrypt
  src/config/db.js       PGlite (embedded Postgres) by default; pg server optional
  src/config/init.js     applies schema + seed + demo users/requests on first boot
  src/routes, src/controllers, src/middleware (requireAuth, requireRole)
  db/schema.sql, db/seed.sql
```

---

## Design

Apple-inspired: a calm, spacious layout, SF-style system type, soft depth and
glass surfaces, a navy→teal brand, and consistent rounded cards. A single design
system (`src/components/ui.jsx`) drives every screen. The map uses Leaflet with a
clean CARTO basemap and custom severity pins.

See **WEEKLY_PROGRESS.md** for the week-by-week build log.
