# Deploying CrisisConnect

A step-by-step guide written for a first deployment. Read the **Mental model**
section once — after that the steps make a lot more sense.

---

## 1. Mental model — what "deploying" actually means

Right now the app runs on **your laptop**: the backend on `localhost:4000`, the
frontend on `localhost:5173`, and the database as a file on your disk. "Deploying"
means putting those same three things onto **computers on the internet** that are
always on, so anyone with the link can use the app.

CrisisConnect has **three pieces**, and each needs a home online:

| Piece | What it is | Where it goes |
|-------|-----------|---------------|
| **Database** | Stores users, requests, incidents… | A hosted PostgreSQL |
| **Backend (API)** | The Node/Express server | A "web service" host |
| **Frontend** | The React app people see | A static-site host / CDN |

The frontend talks to the backend over the internet, and the backend talks to the
database. On your laptop these find each other automatically; online you have to
**tell them each other's addresses** using environment variables. That's the only
genuinely new concept here.

We'll use **[Render](https://render.com)** for all three, because one account and
one file (`render.yaml`) sets up everything. (An alternative split is at the end.)

---

## 2. Before you start

- [ ] The code is pushed to **GitHub** (it already is: `sehjal408/crisisconnect`).
- [ ] You can log into that GitHub account (Render connects to it).
- [ ] *(Optional)* An **Anthropic API key** if you want real Claude triage. Without
      one, the app uses a built-in offline heuristic and still works.

> You do the account creation and the clicking. I can't create accounts, enter
> credentials, or accept terms for you — but I've prepared the repo so the steps
> below are just clicking and pasting.

---

## 3. Deploy with the Render Blueprint (recommended)

The repo already contains a `render.yaml` that describes all three pieces.

### Step 1 — Create a Render account
Go to <https://render.com> → **Get Started** → sign up **with GitHub** (easiest, so
Render can see your repo). Accept their terms when prompted.

### Step 2 — Create the Blueprint
In the Render dashboard: **New +** → **Blueprint** → select the `crisisconnect`
repo → Render reads `render.yaml` and shows the three resources it will create
(database, `crisisconnect-api`, `crisisconnect-web`). Click **Apply**.

Render now:
1. Creates the **PostgreSQL** database.
2. Builds and starts the **backend** (`npm install` → `npm start`).
3. Builds the **frontend** (`npm run build`) and serves the `dist/` folder.

The first build takes a few minutes. ☕

### Step 3 — Add your Anthropic key (optional)
Open the **crisisconnect-api** service → **Environment** tab → set
`ANTHROPIC_API_KEY` to your key → **Save** (the service redeploys). Skip this to
run on the offline heuristic.

### Step 4 — Check the frontend points at the backend
Open **crisisconnect-web** → **Environment** → confirm `VITE_API_URL` equals the
backend's URL (shown at the top of the **crisisconnect-api** page, usually
`https://crisisconnect-api.onrender.com`). If the backend got a different name,
update `VITE_API_URL` to match and redeploy the frontend.

> **Why:** the frontend is downloaded to the visitor's browser, so it must know the
> backend's *public* address. That's exactly what `VITE_API_URL` is for.

### Step 5 — You're live 🎉
Open the **crisisconnect-web** URL. Log in with a seeded demo account:

- `admin@crisisconnect.ca` / `Password123!`
- `volunteer@crisisconnect.ca` / `Password123!`
- `citizen@crisisconnect.ca` / `Password123!`

---

## 4. What happens on first boot (you don't do this — it's automatic)

When the backend starts against the empty hosted database, it **sets itself up**:
it creates all the tables (`schema.sql`), applies migrations, seeds the demo
accounts + sample data, and (if enabled) pulls live B.C. incident feeds. So you do
**not** run any database commands by hand — booting the backend is enough.

---

## 5. The environment variables, explained

Set on the **backend** (most are filled in for you by `render.yaml`):

| Variable | What it does |
|----------|--------------|
| `DB_DRIVER=pg` | Use real PostgreSQL (not the local embedded one). |
| `DATABASE_URL` | The database address. Render injects this automatically. |
| `JWT_SECRET` | Secret used to sign login tokens. Auto-generated. |
| `ANTHROPIC_API_KEY` | Enables Claude triage. Optional; you set it by hand. |
| `CORS_ORIGIN` | Restrict which sites can call the API. Blank = allow all. |
| `PGSSL` | Set to `require` only for an external DB that needs SSL. |

Set on the **frontend**:

| Variable | What it does |
|----------|--------------|
| `VITE_API_URL` | The backend's public URL, so the app can reach the API. |

---

## 6. Making changes after you've deployed — yes, you can!

Deployment is **not** a one-way door. The normal loop is:

```
edit code  →  git commit  →  git push
```

Render watches your GitHub repo and **automatically rebuilds and redeploys** on
every push. So you keep improving the app right up to the defense; each push just
publishes a new version. (A test now doesn't need re-running after deploy — see
the note in the project notes; automated tests check the code, deployment just
checks the live site is up.)

---

## 7. Free-tier things to know

- **Backend sleeps when idle.** On the free plan the API "spins down" after ~15
  minutes of no traffic; the next visit takes ~30–60s to wake it. Fine for a demo
  — just open the site a minute before you present.
- **Free database has a time limit.** Render's free Postgres expires after a set
  period. For something longer-lived, use **Neon** (see below) as the database and
  keep the backend/frontend on Render.
- **Demo accounts are public.** Anyone with the link can log in with the seeded
  accounts. That's intended for a class demo; for a truly public app you'd disable
  the seed and remove test data first.

---

## 8. Quick smoke test after deploying

1. Open `https://<your-api>.onrender.com/health` → should show `{"status":"ok"}`.
2. Open the frontend URL → the login page loads.
3. Log in as `admin@crisisconnect.ca` → the overview loads with data.
4. As a citizen, submit a request → it appears in the admin queue.

If all four work, you're done.

---

## 9. Troubleshooting

| Symptom | Likely cause / fix |
|---------|--------------------|
| Frontend loads but every action fails / "network error" | `VITE_API_URL` is wrong or missing → set it to the backend URL and redeploy the frontend. |
| Login works locally but not deployed | Backend can't reach the DB → check `DATABASE_URL` on the API service. |
| Build fails on the frontend with "vite: not found" | Build must install dev deps → the blueprint uses `npm install --include=dev` (already set). |
| Uploaded photos don't display | `VITE_API_URL` missing — photo URLs are built from it. |
| First request after a while is very slow | Free backend was asleep and is waking up (normal). |
| DB error on connect from an external Postgres | Set `PGSSL=require` on the backend. |

---

## 10. Alternative: Neon (database) + Render (backend) + Vercel (frontend)

If you'd rather use a longer-lived free database and Vercel for the frontend:

1. **Neon** → create a project → copy the connection string.
2. **Render** → New Web Service → root `backend`, start `npm start`; set
   `DB_DRIVER=pg`, `DATABASE_URL=<neon string>`, `PGSSL=require`, `JWT_SECRET`,
   and (optional) `ANTHROPIC_API_KEY`.
3. **Vercel** → import the repo → root `frontend`, framework **Vite**; set
   `VITE_API_URL=<render backend url>`. Deploy.

Same three pieces, three hosts instead of one. The Render Blueprint in section 3
is simpler for a first deployment.
