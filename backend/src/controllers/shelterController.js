const pool = require("../config/db");

async function listShelters(req, res, next) {
  try {
    const { status } = req.query;
    const conditions = [];
    const values = [];

    if (status) {
      values.push(status);
      conditions.push(`status = $${values.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await pool.query(
      `SELECT id, name, address, latitude, longitude, capacity, occupied_beds, available_beds,
              medical_support, pet_friendly, accessibility_support, status
       FROM shelters ${where}
       ORDER BY name ASC`,
      values
    );
    return res.json({ shelters: result.rows });
  } catch (err) {
    return next(err);
  }
}

// (Shelter occupancy management is the Week 10 "Operations modules" item — not in
// the Week 8 MVP scope, so shelters are read-only for now.)

module.exports = { listShelters };
