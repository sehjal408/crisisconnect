const pool = require("../config/db");
const { notify } = require("../services/notify");

async function getMe(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT v.id, v.skills, v.certifications, v.availability, v.vehicle_available, v.verification_status,
              u.name, u.email, u.phone
       FROM volunteers v JOIN users u ON u.id = v.user_id
       WHERE v.user_id = $1`,
      [req.user.id]
    );
    const volunteer = result.rows[0];
    if (!volunteer) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Volunteer profile not found" } });
    }
    return res.json({ volunteer });
  } catch (err) {
    return next(err);
  }
}

async function updateMe(req, res, next) {
  try {
    const { availability, skills, vehicle_available, certifications } = req.body;

    if (availability && !["available", "busy", "unavailable"].includes(availability)) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid availability value" } });
    }

    const result = await pool.query(
      `UPDATE volunteers SET
         availability = COALESCE($1, availability),
         skills = COALESCE($2, skills),
         vehicle_available = COALESCE($3, vehicle_available),
         certifications = COALESCE($4, certifications)
       WHERE user_id = $5
       RETURNING id, skills, certifications, availability, vehicle_available, verification_status`,
      [availability ?? null, skills ?? null, vehicle_available ?? null, certifications ?? null, req.user.id]
    );

    const volunteer = result.rows[0];
    if (!volunteer) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Volunteer profile not found" } });
    }
    return res.json({ volunteer });
  } catch (err) {
    return next(err);
  }
}

// Admin: list volunteers (optionally only those available) for assignment.
async function listVolunteers(req, res, next) {
  try {
    const { availability } = req.query;
    const values = [];
    let where = "WHERE v.verification_status = 'verified'";
    if (availability) {
      values.push(availability);
      where += ` AND v.availability = $${values.length}`;
    }
    const result = await pool.query(
      `SELECT v.id, v.skills, v.certifications, v.availability, v.vehicle_available, u.name, u.email
       FROM volunteers v JOIN users u ON u.id = v.user_id
       ${where}
       ORDER BY u.name ASC`,
      values
    );
    return res.json({ volunteers: result.rows });
  } catch (err) {
    return next(err);
  }
}

// Admin: full volunteer roster (every status) for the verification screen.
async function listAllVolunteers(req, res, next) {
  try {
    const { status } = req.query;
    const values = [];
    let where = "";
    if (status) {
      values.push(status);
      where = `WHERE v.verification_status = $${values.length}`;
    }
    const result = await pool.query(
      `SELECT v.id, v.user_id, v.skills, v.certifications, v.availability,
              v.vehicle_available, v.verification_status,
              u.name, u.email, u.phone, u.created_at
       FROM volunteers v JOIN users u ON u.id = v.user_id
       ${where}
       ORDER BY (v.verification_status = 'pending') DESC, u.created_at DESC`,
      values
    );
    return res.json({ volunteers: result.rows });
  } catch (err) {
    return next(err);
  }
}

// Admin: verify or reject a volunteer (gates whether they can be assigned).
async function setVerification(req, res, next) {
  try {
    const { status } = req.body;
    if (!["verified", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "status must be 'verified', 'rejected' or 'pending'" } });
    }
    const result = await pool.query(
      `UPDATE volunteers SET verification_status = $1 WHERE id = $2
       RETURNING id, user_id, verification_status`,
      [status, req.params.id]
    );
    const volunteer = result.rows[0];
    if (!volunteer) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Volunteer not found" } });
    }
    if (status === "verified") {
      await notify(volunteer.user_id, "volunteer_verified", "Your volunteer account has been verified — you can now receive assignments.");
    } else if (status === "rejected") {
      await notify(volunteer.user_id, "volunteer_rejected", "Your volunteer verification was not approved. Contact an administrator for details.");
    }
    return res.json({ volunteer });
  } catch (err) {
    return next(err);
  }
}

// Volunteer: assignments for the signed-in volunteer.
async function myAssignments(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT a.id, a.status, a.assigned_at, a.completed_at,
              r.id AS request_id, r.request_type, r.description, r.address,
              r.latitude, r.longitude, r.priority_score, r.status AS request_status,
              cu.name AS citizen_name
       FROM assignments a
       JOIN volunteers v ON v.id = a.volunteer_id
       JOIN requests r ON r.id = a.request_id
       JOIN users cu ON cu.id = r.citizen_id
       WHERE v.user_id = $1
       ORDER BY a.assigned_at DESC`,
      [req.user.id]
    );
    const assignments = result.rows.map((row) => ({
      id: row.id,
      status: row.status,
      assigned_at: row.assigned_at,
      completed_at: row.completed_at,
      request: {
        id: row.request_id,
        request_type: row.request_type,
        description: row.description,
        address: row.address,
        latitude: row.latitude,
        longitude: row.longitude,
        priority_score: row.priority_score,
        status: row.request_status,
        citizen_name: row.citizen_name,
      },
    }));
    return res.json({ assignments });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getMe, updateMe, listVolunteers, myAssignments, listAllVolunteers, setVerification };
