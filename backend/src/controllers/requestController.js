const pool = require("../config/db");

// NOTE: automatic AI triage (severity scoring / classification / priority) is the
// Week 9 "AI logic layer". For the Week 8 MVP, requests are triaged MANUALLY by an
// administrator (review -> assign -> resolve). The ai_* / priority_score columns
// exist in the schema (Week 5 design) but are left for the AI layer to populate later.

// Citizen: my own requests
async function myRequests(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT * FROM requests WHERE citizen_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    return res.json({ requests: result.rows });
  } catch (err) {
    return next(err);
  }
}

// Citizen: create a request (status 'pending'; an admin reviews it)
async function createRequest(req, res, next) {
  try {
    const { request_type, description, incident_id, address, latitude, longitude, affected_count } = req.body;
    if (!request_type || !description) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "request_type and description are required" } });
    }
    const count = Number(affected_count) || 1;
    const result = await pool.query(
      `INSERT INTO requests
         (incident_id, citizen_id, request_type, description, address, latitude, longitude,
          affected_count, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
       RETURNING *`,
      [incident_id || null, req.user.id, request_type, description, address || null,
       latitude || null, longitude || null, count]
    );
    return res.status(201).json({ request: result.rows[0] });
  } catch (err) {
    return next(err);
  }
}

// Admin: full queue (most recent first), with citizen + incident + assignment info
async function listRequests(req, res, next) {
  try {
    const { status } = req.query;
    const values = [];
    let where = "";
    if (status) {
      values.push(status);
      where = `WHERE r.status = $${values.length}`;
    }
    const result = await pool.query(
      `SELECT r.*, cu.name AS citizen_name, i.title AS incident_title,
              a.id AS assignment_id, a.volunteer_id AS assignment_volunteer_id, a.status AS assignment_status
       FROM requests r
       JOIN users cu ON cu.id = r.citizen_id
       LEFT JOIN incidents i ON i.id = r.incident_id
       LEFT JOIN assignments a ON a.request_id = r.id
       ${where}
       ORDER BY r.created_at DESC`,
      values
    );
    const requests = result.rows.map(({ assignment_id, assignment_volunteer_id, assignment_status, ...r }) => ({
      ...r,
      assignment: assignment_id
        ? { id: assignment_id, volunteer_id: assignment_volunteer_id, status: assignment_status }
        : null,
    }));
    return res.json({ requests });
  } catch (err) {
    return next(err);
  }
}

// Admin: update a request's status (review / resolve)
async function updateRequest(req, res, next) {
  try {
    const { status } = req.body;
    const allowed = ["pending", "reviewed", "assigned", "in_progress", "resolved", "closed"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid status value" } });
    }
    const result = await pool.query(
      `UPDATE requests SET status = $1 WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Request not found" } });
    }
    return res.json({ request: result.rows[0] });
  } catch (err) {
    return next(err);
  }
}

// Admin: assign a volunteer to a request (creates/updates the assignment)
async function assignRequest(req, res, next) {
  const client = await pool.connect();
  try {
    const { volunteer_id } = req.body;
    if (!volunteer_id) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "volunteer_id is required" } });
    }
    await client.query("BEGIN");
    const existing = await client.query(`SELECT id FROM assignments WHERE request_id = $1`, [req.params.id]);
    let assignment;
    if (existing.rows[0]) {
      const upd = await client.query(
        `UPDATE assignments SET volunteer_id = $1, status = 'assigned' WHERE request_id = $2 RETURNING *`,
        [volunteer_id, req.params.id]
      );
      assignment = upd.rows[0];
    } else {
      const ins = await client.query(
        `INSERT INTO assignments (request_id, volunteer_id, status) VALUES ($1, $2, 'assigned') RETURNING *`,
        [req.params.id, volunteer_id]
      );
      assignment = ins.rows[0];
    }
    await client.query(`UPDATE requests SET status = 'assigned' WHERE id = $1`, [req.params.id]);
    await client.query("COMMIT");
    return res.status(201).json({ assignment });
  } catch (err) {
    await client.query("ROLLBACK");
    return next(err);
  } finally {
    client.release();
  }
}

module.exports = { myRequests, createRequest, listRequests, updateRequest, assignRequest };
