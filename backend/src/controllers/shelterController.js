const pool = require("../config/db");
const { notifyAdmins, capacityMessage } = require("../services/notify");

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

const STATUSES = ["open", "full", "closed"];

// Derive open/full from remaining capacity, but never override a manual 'closed'.
function autoStatus(capacity, occupied, currentStatus) {
  if (currentStatus === "closed") return "closed";
  return capacity - occupied <= 0 ? "full" : "open";
}

// Admin: create a shelter.
async function createShelter(req, res, next) {
  try {
    const b = req.body || {};
    if (!b.name || !b.address || b.latitude == null || b.longitude == null || b.capacity == null) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "name, address, location and capacity are required" } });
    }
    const capacity = Math.max(0, Number(b.capacity));
    const occupied = Math.min(capacity, Math.max(0, Number(b.occupied_beds) || 0));
    const status = STATUSES.includes(b.status) ? b.status : autoStatus(capacity, occupied, "open");
    const r = await pool.query(
      `INSERT INTO shelters
         (name, address, latitude, longitude, capacity, occupied_beds, medical_support, pet_friendly, accessibility_support, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [b.name, b.address, Number(b.latitude), Number(b.longitude), capacity, occupied,
       !!b.medical_support, !!b.pet_friendly, !!b.accessibility_support, status]
    );
    return res.status(201).json({ shelter: r.rows[0] });
  } catch (err) {
    return next(err);
  }
}

// Admin: update a shelter — occupancy (check-in/out), status (open/close), or details.
// Accepts any subset of fields. available_beds recomputes automatically (generated column).
async function updateShelter(req, res, next) {
  try {
    const cur = (await pool.query(`SELECT * FROM shelters WHERE id = $1`, [req.params.id])).rows[0];
    if (!cur) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Shelter not found" } });
    const b = req.body || {};

    const capacity = b.capacity != null ? Math.max(0, Number(b.capacity)) : cur.capacity;
    let occupied = b.occupied_beds != null ? Number(b.occupied_beds) : cur.occupied_beds;
    occupied = Math.min(capacity, Math.max(0, occupied)); // clamp to [0, capacity]
    const status = STATUSES.includes(b.status) ? b.status : autoStatus(capacity, occupied, cur.status);

    const r = await pool.query(
      `UPDATE shelters SET
         name=$1, address=$2, latitude=$3, longitude=$4, capacity=$5, occupied_beds=$6,
         medical_support=$7, pet_friendly=$8, accessibility_support=$9, status=$10
       WHERE id=$11 RETURNING *`,
      [
        b.name ?? cur.name,
        b.address ?? cur.address,
        b.latitude != null ? Number(b.latitude) : cur.latitude,
        b.longitude != null ? Number(b.longitude) : cur.longitude,
        capacity, occupied,
        b.medical_support != null ? !!b.medical_support : cur.medical_support,
        b.pet_friendly != null ? !!b.pet_friendly : cur.pet_friendly,
        b.accessibility_support != null ? !!b.accessibility_support : cur.accessibility_support,
        status, req.params.id,
      ]
    );
    const next_ = r.rows[0];
    // Alert admins if this update tipped the shelter into "nearly full" / "full".
    const capMsg = capacityMessage(cur, next_);
    if (capMsg) notifyAdmins("capacity", capMsg);
    return res.json({ shelter: next_ });
  } catch (err) {
    return next(err);
  }
}

module.exports = { listShelters, createShelter, updateShelter };
