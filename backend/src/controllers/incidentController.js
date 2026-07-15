const pool = require("../config/db");
const { runIngest } = require("../services/ingest");

async function listIncidents(req, res, next) {
  try {
    const { type, status, severity } = req.query;
    const conditions = [];
    const values = [];

    if (type) {
      values.push(type);
      conditions.push(`type = $${values.length}`);
    }
    if (status) {
      values.push(status);
      conditions.push(`status = $${values.length}`);
    }
    if (severity) {
      values.push(severity);
      conditions.push(`severity = $${values.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await pool.query(
      `SELECT id, title, type, latitude, longitude, severity, status, source, updated_at
       FROM incidents ${where}
       ORDER BY updated_at DESC`,
      values
    );
    return res.json({ incidents: result.rows });
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
// (Admin verification of ingested incidents is the Week 10 step.)
async function ingestIncidents(req, res, next) {
  try {
    const summary = await runIngest();
    return res.json({ summary });
  } catch (err) {
    return next(err);
  }
}

module.exports = { listIncidents, getIncident, ingestIncidents };
