// One-time database initialization: applies schema.sql + seed.sql, then creates
// demo users (bcrypt-hashed) and a few sample requests so the Week 8 loop has data.
// Requests are created WITHOUT AI fields — triage is manual until the Week 9 AI layer.
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const db = require("./db");
const { heuristicTriage } = require("../services/triage");

const DEMO_PASSWORD = "Password123!";
const DB_DIR = path.join(__dirname, "..", "..", "db");

const USERS = [
  { name: "Dana Whitfield", email: "admin@crisisconnect.ca", phone: "604-555-0100", role: "admin" },
  { name: "Jordan Lee", email: "volunteer@crisisconnect.ca", phone: "604-555-0101", role: "volunteer",
    skills: ["first_aid", "driving", "translation_fr"], vehicle_available: true },
  { name: "Priya Sharma", email: "priya@crisisconnect.ca", phone: "604-555-0110", role: "volunteer",
    skills: ["first_aid", "counselling"], vehicle_available: false },
  { name: "Marcus Bell", email: "marcus@crisisconnect.ca", phone: "604-555-0111", role: "volunteer",
    skills: ["driving", "logistics", "search_rescue"], vehicle_available: true },
  { name: "Sam Rivera", email: "citizen@crisisconnect.ca", phone: "604-555-0102", role: "citizen" },
];

const REQUESTS = [
  { incident: "Wildfire near Lytton", type: "medical", count: 1, address: "Lytton, BC",
    description: "Elderly neighbour needs oxygen and medication; smoke is heavy.", status: "pending" },
  { incident: "Fraser River flood watch — Delta", type: "shelter", count: 4, address: "Ladner, Delta, BC",
    description: "Family of four needs a place to stay after flood evacuation.", status: "reviewed" },
  { incident: null, type: "transportation", count: 2, address: "Sumas Prairie, Abbotsford, BC",
    description: "No vehicle to leave the evacuation zone.", status: "pending" },
];

async function isInitialized() {
  try {
    const r = await db.query("SELECT COUNT(*)::int AS n FROM users");
    return r.rows[0].n > 0;
  } catch {
    return false; // table doesn't exist yet
  }
}

async function initDb() {
  await db.ready;
  if (await isInitialized()) return false;

  // schema (drop CREATE EXTENSION lines — not needed and not in PGlite by default)
  const schema = fs
    .readFileSync(path.join(DB_DIR, "schema.sql"), "utf8")
    .split("\n")
    .filter((l) => !/^\s*CREATE EXTENSION/i.test(l))
    .join("\n");
  await db.exec(schema);

  // reference data (shelters + incidents)
  await db.exec(fs.readFileSync(path.join(DB_DIR, "seed.sql"), "utf8"));

  // users + volunteer profiles
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const ids = {};
  for (const u of USERS) {
    const r = await db.query(
      `INSERT INTO users (name, email, password_hash, phone, role) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [u.name, u.email, hash, u.phone, u.role]
    );
    ids[u.email] = r.rows[0].id;
    if (u.role === "volunteer") {
      const arr = "ARRAY[" + (u.skills || []).map((s) => `'${s}'`).join(",") + "]::text[]";
      await db.query(
        `INSERT INTO volunteers (user_id, skills, availability, vehicle_available, verification_status)
         VALUES ($1, ${arr}, 'available', $2, 'verified')`,
        [r.rows[0].id, u.vehicle_available || false]
      );
    }
  }

  // sample citizen requests — scored by the Week 9 AI triage layer (heuristic at
  // seed time, so the demo shows priority ordering offline with no API cost).
  const citizenId = ids["citizen@crisisconnect.ca"];
  for (const rq of REQUESTS) {
    let incidentId = null;
    if (rq.incident) {
      const inc = await db.query(`SELECT id FROM incidents WHERE title = $1 LIMIT 1`, [rq.incident]);
      incidentId = inc.rows[0] ? inc.rows[0].id : null;
    }
    const { priority_score, ai_category, ai_summary } = heuristicTriage({
      request_type: rq.type, description: rq.description, affected_count: rq.count,
    });
    await db.query(
      `INSERT INTO requests (incident_id, citizen_id, request_type, description, address,
         affected_count, priority_score, ai_category, ai_summary, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [incidentId, citizenId, rq.type, rq.description, rq.address, rq.count,
       priority_score, ai_category, ai_summary, rq.status]
    );
  }

  // one assignment so the volunteer dashboard has a live task
  const vol = await db.query(
    `SELECT v.id FROM volunteers v JOIN users u ON u.id = v.user_id WHERE u.email = 'volunteer@crisisconnect.ca'`
  );
  const med = await db.query(`SELECT id FROM requests WHERE request_type = 'medical' LIMIT 1`);
  if (vol.rows[0] && med.rows[0]) {
    await db.query(`INSERT INTO assignments (request_id, volunteer_id, status) VALUES ($1,$2,'accepted')`, [med.rows[0].id, vol.rows[0].id]);
    await db.query(`UPDATE requests SET status = 'assigned' WHERE id = $1`, [med.rows[0].id]);
  }

  return true;
}

module.exports = { initDb, DEMO_PASSWORD };
