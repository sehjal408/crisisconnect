const pool = require("../config/db");
const { triageRequest } = require("../services/triage");
const { runDedup } = require("../services/dedup");
const { notify, notifyAdmins, capacityMessage } = require("../services/notify");

const STATUS_LABEL = { reviewed: "reviewed", assigned: "assigned", in_progress: "in progress", resolved: "resolved", closed: "closed" };

const INCIDENT_TYPES = ["earthquake", "weather", "wildfire", "flood", "road_closure", "transportation", "evacuation", "air_quality", "other"];
const SEVERITIES = ["low", "medium", "high", "critical"];
// Map the AI priority score to a starting incident severity (mirrors priorityBand on the client).
function severityFromScore(score) {
  if (score == null) return "medium";
  if (score >= 85) return "critical";
  if (score >= 60) return "high";
  if (score >= 30) return "medium";
  return "low";
}

// Week 9 "AI logic layer": incoming requests are auto-triaged on creation — the
// AI (Claude Haiku, with a keyword-heuristic fallback) fills priority_score /
// ai_category / ai_summary so the admin queue can be ordered by urgency. This is
// HUMAN-IN-THE-LOOP: the score is only a suggestion; an administrator still
// reviews, assigns, and resolves every request (review -> assign -> resolve).

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

    // Week 9 AI auto-triage — never blocks the save; returns a heuristic result
    // if the AI is unavailable, so a request always gets a priority.
    const { priority_score, ai_category, ai_summary } = await triageRequest({
      request_type, description, affected_count: count,
    });

    const result = await pool.query(
      `INSERT INTO requests
         (incident_id, citizen_id, request_type, description, address, latitude, longitude,
          affected_count, priority_score, ai_category, ai_summary, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')
       RETURNING *`,
      [incident_id || null, req.user.id, request_type, description, address || null,
       latitude || null, longitude || null, count, priority_score, ai_category, ai_summary]
    );
    const created = result.rows[0];
    // Alert admins about high-priority requests so critical cases don't sit unseen.
    if (created.priority_score != null && created.priority_score >= 85) {
      notifyAdmins("request", `New high-priority request: ${created.request_type} (priority ${created.priority_score}).`);
    }
    return res.status(201).json({ request: created });
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
       ORDER BY r.priority_score DESC NULLS LAST, r.created_at DESC`,
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
      `UPDATE requests
          SET status = $1,
              resolved_at = CASE WHEN $1 IN ('resolved','closed') AND resolved_at IS NULL THEN now()
                                 WHEN $1 NOT IN ('resolved','closed') THEN NULL
                                 ELSE resolved_at END
        WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Request not found" } });
    }
    const updated = result.rows[0];
    // Keep the citizen in the loop as their request moves through the workflow.
    if (STATUS_LABEL[status]) {
      notify(updated.citizen_id, "request", `Your ${updated.request_type} request is now ${STATUS_LABEL[status]}.`);
    }
    return res.json({ request: updated });
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

    // Notify the volunteer (their new task) and the citizen (help is on the way).
    try {
      const r = (await pool.query(`SELECT request_type, address, citizen_id FROM requests WHERE id = $1`, [req.params.id])).rows[0];
      const v = (await pool.query(`SELECT user_id FROM volunteers WHERE id = $1`, [volunteer_id])).rows[0];
      if (v) notify(v.user_id, "assignment", `You've been assigned a new task: ${r.request_type}${r.address ? " · " + r.address : ""}.`);
      if (r) notify(r.citizen_id, "request", `A volunteer has been assigned to your ${r.request_type} request.`);
    } catch (e) { /* best-effort */ }
    return res.status(201).json({ assignment });
  } catch (err) {
    await client.query("ROLLBACK");
    return next(err);
  } finally {
    client.release();
  }
}

// Admin: promote a citizen request into a new incident and link them.
// Used when a citizen picked "Not sure / none" (no matching incident existed):
// the admin turns the report into a mappable incident. The incident is created
// source='citizen', status='verified' (an admin is vouching for it), and the
// request's incident_id is set so the two stay linked.
async function createIncidentFromRequest(req, res, next) {
  const client = await pool.connect();
  try {
    const request = (await client.query(`SELECT * FROM requests WHERE id = $1`, [req.params.id])).rows[0];
    if (!request) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Request not found" } });
    }
    if (request.incident_id) {
      return res.status(409).json({ error: { code: "ALREADY_LINKED", message: "This request is already linked to an incident" } });
    }

    const { title, type, severity, latitude, longitude } = req.body || {};
    const lat = latitude != null ? Number(latitude) : request.latitude;
    const lon = longitude != null ? Number(longitude) : request.longitude;
    if (lat == null || lon == null || Number.isNaN(lat) || Number.isNaN(lon)) {
      return res.status(400).json({ error: { code: "NO_LOCATION", message: "A map location is required to place an incident" } });
    }
    const incType = INCIDENT_TYPES.includes(type) ? type : "other";
    const sev = SEVERITIES.includes(severity) ? severity : severityFromScore(request.priority_score);
    const incTitle = (title && title.trim()) || `Citizen report — ${request.address || "B.C."}`;

    await client.query("BEGIN");
    const ins = await client.query(
      `INSERT INTO incidents
         (title, type, description, latitude, longitude, severity, status, source, reported_by, verified_by, verified_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'verified', 'citizen', $7, $8, now())
       RETURNING *`,
      [incTitle, incType, request.description, lat, lon, sev, request.citizen_id, req.user.id]
    );
    const incident = ins.rows[0];
    await client.query(`UPDATE requests SET incident_id = $1 WHERE id = $2`, [incident.id, req.params.id]);
    await client.query("COMMIT");

    // Cross-source de-dup: if this citizen report duplicates an existing feed
    // incident, it gets merged. Re-point the request to the visible canonical so
    // it doesn't link to a now-hidden duplicate. Best-effort — never blocks.
    let effective = incident;
    try {
      await runDedup();
      const chk = await pool.query(`SELECT duplicate_of FROM incidents WHERE id = $1`, [incident.id]);
      const canonicalId = chk.rows[0] && chk.rows[0].duplicate_of;
      if (canonicalId) {
        await pool.query(`UPDATE requests SET incident_id = $1 WHERE id = $2`, [canonicalId, req.params.id]);
        effective = (await pool.query(`SELECT * FROM incidents WHERE id = $1`, [canonicalId])).rows[0] || incident;
      }
    } catch (e) { /* best-effort de-dup */ }
    return res.status(201).json({ incident: effective, merged: effective.id !== incident.id });
  } catch (err) {
    await client.query("ROLLBACK");
    return next(err);
  } finally {
    client.release();
  }
}

// Admin: place a citizen request into a shelter. Links the request to the shelter,
// consumes beds (by affected_count), flips the shelter to 'full' when it fills, and
// marks the request resolved. If the request was already placed elsewhere, those
// beds are freed first. All in one transaction so bed counts never drift.
async function placeInShelter(req, res, next) {
  const client = await pool.connect();
  try {
    const shelterId = Number((req.body || {}).shelter_id);
    if (!shelterId) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "shelter_id is required" } });
    }
    const request = (await client.query(`SELECT * FROM requests WHERE id = $1`, [req.params.id])).rows[0];
    if (!request) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Request not found" } });
    const shelter = (await client.query(`SELECT * FROM shelters WHERE id = $1`, [shelterId])).rows[0];
    if (!shelter) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Shelter not found" } });

    const already = request.shelter_id === shelterId;
    if (!already) {
      if (shelter.status === "closed") return res.status(409).json({ error: { code: "SHELTER_CLOSED", message: "That shelter is closed" } });
      if (shelter.available_beds <= 0) return res.status(409).json({ error: { code: "SHELTER_FULL", message: "That shelter is full" } });
    }
    const need = request.affected_count || 1;

    await client.query("BEGIN");
    if (!already) {
      // free beds at the previous shelter, if any
      if (request.shelter_id) {
        await client.query(
          `UPDATE shelters SET occupied_beds = GREATEST(0, occupied_beds - $1),
             status = CASE WHEN status='closed' THEN 'closed'
                           WHEN (capacity - GREATEST(0, occupied_beds - $1)) <= 0 THEN 'full' ELSE 'open' END
           WHERE id = $2`, [need, request.shelter_id]);
      }
      // consume beds at the target (capped at capacity), auto full/open
      await client.query(
        `UPDATE shelters SET occupied_beds = LEAST(capacity, occupied_beds + $1),
           status = CASE WHEN status='closed' THEN 'closed'
                         WHEN (capacity - LEAST(capacity, occupied_beds + $1)) <= 0 THEN 'full' ELSE 'open' END
         WHERE id = $2`, [need, shelterId]);
    }
    const reqUpd = await client.query(
      `UPDATE requests SET shelter_id = $1, status = 'resolved', resolved_at = COALESCE(resolved_at, now())
        WHERE id = $2 RETURNING *`,
      [shelterId, req.params.id]
    );
    const shUpd = (await client.query(`SELECT * FROM shelters WHERE id = $1`, [shelterId])).rows[0];
    await client.query("COMMIT");

    // Confirm placement to the citizen; alert admins if this filled the shelter.
    notify(request.citizen_id, "shelter", `You've been placed at ${shUpd.name}.`);
    const capMsg = capacityMessage(shelter, shUpd);
    if (capMsg) notifyAdmins("capacity", capMsg);
    return res.json({ request: reqUpd.rows[0], shelter: shUpd });
  } catch (err) {
    await client.query("ROLLBACK");
    return next(err);
  } finally {
    client.release();
  }
}

module.exports = { myRequests, createRequest, listRequests, updateRequest, assignRequest, createIncidentFromRequest, placeInShelter };
