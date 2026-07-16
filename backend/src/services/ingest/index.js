// ============================================================
// Week 9/10 — Live incident-feed ingestion framework
// ------------------------------------------------------------
// Pulls incidents from official public sources, maps them to the `incidents`
// table, and UPSERTs by (source, external_id) so a re-fetch updates rather than
// duplicates. New feed incidents land as status 'pending' — an administrator
// verifies them (the Week 10 "admin verification" step); verified incidents are
// never reset back to pending on refresh.
//
// Resilience: each source is fetched independently and wrapped in try/catch, so
// one failing feed (or no internet) never breaks the others or the app.
//
// Week 9 priority feeds: earthquakes (USGS), wildfires (BCWS), weather (ECCC).
// Week 10 feeds: floods (BC River Forecast), roads (DriveBC), evacuations
// (EmergencyInfoBC), air quality (AQHI). All seven are B.C. sources and every
// point is filtered to inside British Columbia (see geo.js). Cross-source
// de-dup + admin verification are the remaining Week 10 items.
// ============================================================
const pool = require("../../config/db");
const usgs = require("./sources/usgs");
const bcwildfire = require("./sources/bcwildfire");
const eccc = require("./sources/eccc");
const drivebc = require("./sources/drivebc");
const aqhi = require("./sources/aqhi");
const bcflood = require("./sources/bcflood");
const evacbc = require("./sources/evacbc");

const SOURCES = [usgs, bcwildfire, eccc, drivebc, aqhi, bcflood, evacbc];

const ENABLED = (process.env.INGEST_ENABLED || "on").toLowerCase() !== "off";
const ON_BOOT = (process.env.INGEST_ON_BOOT || "on").toLowerCase() !== "off";
const INTERVAL_MIN = Number(process.env.INGEST_INTERVAL_MIN);

const UPSERT = `
  INSERT INTO incidents
    (external_id, title, type, description, latitude, longitude, severity, status, source)
  VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8)
  ON CONFLICT (source, external_id) WHERE external_id IS NOT NULL
  DO UPDATE SET
    title       = EXCLUDED.title,
    description = EXCLUDED.description,
    severity    = EXCLUDED.severity,
    latitude    = EXCLUDED.latitude,
    longitude   = EXCLUDED.longitude,
    updated_at  = now()
  RETURNING (xmax = 0) AS inserted`;

// Make sure the idempotency column + unique index exist even on a database that
// was created before this feature (fresh DBs get them from schema.sql).
let _schemaReady = null;
async function ensureSchema() {
  if (_schemaReady) return _schemaReady;
  _schemaReady = (async () => {
    await pool.exec(
      `ALTER TABLE incidents ADD COLUMN IF NOT EXISTS external_id VARCHAR(200);
       CREATE UNIQUE INDEX IF NOT EXISTS ux_incidents_source_extid
         ON incidents(source, external_id) WHERE external_id IS NOT NULL;`
    );
  })();
  return _schemaReady;
}

// Fetch every source and upsert. Returns a per-source summary.
async function runIngest() {
  await ensureSchema();
  const summary = [];
  for (const src of SOURCES) {
    const row = { source: src.name, fetched: 0, inserted: 0, updated: 0, removed: 0, error: null };
    try {
      const items = await src.fetch();
      row.fetched = items.length;
      const seen = [];
      for (const it of items) {
        if (!it.external_id) continue;
        seen.push(it.external_id);
        try {
          const res = await pool.query(UPSERT, [
            it.external_id, it.title, it.type, it.description || null,
            it.latitude, it.longitude, it.severity, it.source,
          ]);
          if (res.rows[0] && res.rows[0].inserted) row.inserted++;
          else row.updated++;
        } catch (e) {
          if (!row.error) row.error = `row: ${e.message}`;
        }
      }
      // Remove this source's incidents that are no longer in the live feed
      // (resolved/expired), so the map stays in sync. Only unverified feed rows
      // are touched, and only after a successful fetch (so a transient failure
      // never wipes data). Runs only when the source declares its DB `source`.
      if (src.source) {
        const del = seen.length
          ? await pool.query(
              `DELETE FROM incidents WHERE source = $1 AND external_id IS NOT NULL
                 AND verified_at IS NULL AND NOT (external_id = ANY($2))`,
              [src.source, seen]
            )
          : await pool.query(
              `DELETE FROM incidents WHERE source = $1 AND external_id IS NOT NULL AND verified_at IS NULL`,
              [src.source]
            );
        row.removed = del.rowCount || 0;
      }
    } catch (e) {
      row.error = e.message;
    }
    console.log(
      `[ingest] ${src.name}: fetched=${row.fetched} new=${row.inserted} updated=${row.updated} removed=${row.removed}` +
      (row.error ? ` error=${row.error}` : "")
    );
    summary.push(row);
  }
  return summary;
}

// Called once at server startup: ensures schema, optionally ingests on boot, and
// sets up the periodic refresh. Safe to call even when ingestion is disabled.
async function startIngestion() {
  await ensureSchema();
  if (!ENABLED) {
    console.log("[ingest] disabled (INGEST_ENABLED=off) — feeds will not refresh.");
    return;
  }
  if (ON_BOOT) {
    // don't block server startup — run shortly after listening
    setTimeout(() => { runIngest().catch((e) => console.warn("[ingest] boot run failed:", e.message)); }, 1500);
  }
  if (Number.isFinite(INTERVAL_MIN) && INTERVAL_MIN > 0) {
    setInterval(() => { runIngest().catch((e) => console.warn("[ingest] refresh failed:", e.message)); }, INTERVAL_MIN * 60000);
    console.log(`[ingest] periodic refresh every ${INTERVAL_MIN} min.`);
  }
}

module.exports = { runIngest, startIngestion, ensureSchema };
