const pool = require("../config/db");

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

// (Admin incident verification is the Week 10 "admin verification" item — not in
// the Week 8 MVP scope, so incidents are read-only for now.)

module.exports = { listIncidents, getIncident };
