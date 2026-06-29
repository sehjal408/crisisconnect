const pool = require("../config/db");

// Volunteer: advance an assignment (accept -> in_progress -> completed).
// Keeps the linked request's status in step.
async function updateAssignment(req, res, next) {
  const client = await pool.connect();
  try {
    const { status } = req.body;
    const allowed = ["assigned", "accepted", "in_progress", "completed", "cancelled"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid status value" } });
    }

    // Ensure this assignment belongs to the signed-in volunteer.
    const owns = await client.query(
      `SELECT a.id, a.request_id FROM assignments a
       JOIN volunteers v ON v.id = a.volunteer_id
       WHERE a.id = $1 AND v.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!owns.rows[0]) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Assignment not found" } });
    }
    const requestId = owns.rows[0].request_id;

    await client.query("BEGIN");
    const completedAt = status === "completed" ? "now()" : "completed_at";
    const upd = await client.query(
      `UPDATE assignments SET status = $1, completed_at = ${completedAt} WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );

    const requestStatus =
      status === "completed" ? "resolved" : status === "in_progress" ? "in_progress" : status === "accepted" ? "assigned" : null;
    if (requestStatus) {
      await client.query(`UPDATE requests SET status = $1 WHERE id = $2`, [requestStatus, requestId]);
    }
    await client.query("COMMIT");
    return res.json({ assignment: upd.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    return next(err);
  } finally {
    client.release();
  }
}

module.exports = { updateAssignment };
