const pool = require("../config/db");
const { runIngest } = require("../services/ingest");
const { runDedup } = require("../services/dedup");

// Visibility rule (the "visible vs. verified" decouple):
//  - Official-feed incidents are trusted, so they show to everyone immediately,
//    even while 'pending'. Admin verification of a feed item is optional curation.
//  - Citizen-reported incidents (source = 'citizen') stay hidden until an admin
//    verifies them. 'dismissed' incidents and merged duplicates never show.
//  - Admins see everything (so they can work the verification queue), except
//    'dismissed' unless they explicitly ask for it via ?status=dismissed.
async function listIncidents(req, res, next) {
  try {
    const { type, status, severity, merged } = req.query;
    const isAdmin = req.user && req.user.role === "admin";

    // Admin "Merged" view: the hidden duplicates, each with its canonical's title.
    if (isAdmin && merged === "1") {
      const r = await pool.query(
        `SELECT i.id, i.title, i.type, i.latitude, i.longitude, i.severity, i.status, i.source, i.updated_at,
                i.duplicate_of, c.title AS merged_into_title, c.source AS merged_into_source
           FROM incidents i JOIN incidents c ON c.id = i.duplicate_of
          WHERE i.duplicate_of IS NOT NULL AND i.status <> 'dismissed'
          ORDER BY i.updated_at DESC`
      );
      return res.json({ incidents: r.rows });
    }

    const conditions = ["duplicate_of IS NULL"]; // merged duplicates never show
    const values = [];

    if (isAdmin) {
      if (!status) conditions.push(`status <> 'dismissed'`);
    } else {
      conditions.push(`status <> 'dismissed'`);
      conditions.push(`NOT (status = 'pending' AND source = 'citizen')`);
    }
    if (status) {
      values.push(status);
      conditions.push(`status = $${values.length}`);
    }
    if (type) {
      values.push(type);
      conditions.push(`type = $${values.length}`);
    }
    if (severity) {
      values.push(severity);
      conditions.push(`severity = $${values.length}`);
    }

    const where = `WHERE ${conditions.join(" AND ")}`;
    const result = await pool.query(
      `SELECT id, title, type, latitude, longitude, severity, status, source, verified_at, updated_at
       FROM incidents ${where}
       ORDER BY updated_at DESC`,
      values
    );
    return res.json({ incidents: result.rows });
  } catch (err) {
    return next(err);
  }
}

// Admin: verify a pending incident (make a citizen report public / curate a feed
// item so it survives feed refreshes). Records who verified it and when.
async function verifyIncident(req, res, next) {
  try {
    const result = await pool.query(
      `UPDATE incidents
          SET status = 'verified', verified_by = $1, verified_at = now(), updated_at = now()
        WHERE id = $2 RETURNING *`,
      [req.user.id, req.params.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Incident not found" } });
    }
    return res.json({ incident: result.rows[0] });
  } catch (err) {
    return next(err);
  }
}

// Admin: dismiss a false / irrelevant incident (hidden from every surface).
async function dismissIncident(req, res, next) {
  try {
    const result = await pool.query(
      `UPDATE incidents
          SET status = 'dismissed', verified_by = $1, verified_at = now(), updated_at = now()
        WHERE id = $2 RETURNING *`,
      [req.user.id, req.params.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Incident not found" } });
    }
    return res.json({ incident: result.rows[0] });
  } catch (err) {
    return next(err);
  }
}

async function getIncident(req, res, next) {
  try {
    const result = await pool.query(`SELECT * FROM incidents WHERE id = $1`, [req.params.id]);
    const incident = result.rows[0];
    if (!incident) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Incident not found" } });
    }
    return res.json({ incident });
  } catch (err) {
    return next(err);
  }
}

// Admin: pull the latest from the live official feeds (USGS / BC Wildfire / ECCC)
// and upsert them into the incidents table. Returns a per-source summary.
// Ingest also runs a cross-source de-dup pass at the end.
async function ingestIncidents(req, res, next) {
  try {
    const summary = await runIngest();
    return res.json({ summary });
  } catch (err) {
    return next(err);
  }
}

// Admin: run the cross-source de-duplication pass on demand.
async function dedupIncidents(req, res, next) {
  try {
    const summary = await runDedup();
    return res.json({ summary });
  } catch (err) {
    return next(err);
  }
}

// Admin: undo a merge. The incident becomes visible again and is flagged
// `keep_distinct` so the auto de-dup never re-merges it.
async function unmergeIncident(req, res, next) {
  try {
    const result = await pool.query(
      `UPDATE incidents SET duplicate_of = NULL, keep_distinct = true, updated_at = now()
        WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Incident not found" } });
    }
    return res.json({ incident: result.rows[0] });
  } catch (err) {
    return next(err);
  }
}

module.exports = { listIncidents, getIncident, ingestIncidents, dedupIncidents, verifyIncident, dismissIncident, unmergeIncident };
