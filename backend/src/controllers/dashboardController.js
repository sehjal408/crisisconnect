const pool = require("../config/db");

async function getSummary(req, res, next) {
  try {
    const [incidents, requests, volunteers, shelters] = await Promise.all([
      pool.query(`SELECT
          COUNT(*) FILTER (WHERE status NOT IN ('resolved', 'closed')) AS active,
          COUNT(*) FILTER (WHERE status IN ('resolved', 'closed')) AS resolved
        FROM incidents`),
      pool.query(`SELECT COUNT(*) AS open FROM requests WHERE status NOT IN ('resolved', 'closed')`),
      pool.query(`SELECT COUNT(*) AS available FROM volunteers WHERE availability = 'available'`),
      pool.query(`SELECT COALESCE(SUM(capacity), 0) AS total_capacity, COALESCE(SUM(available_beds), 0) AS available_beds FROM shelters`),
    ]);

    return res.json({
      active_incidents: Number(incidents.rows[0].active),
      resolved_incidents: Number(incidents.rows[0].resolved),
      open_requests: Number(requests.rows[0].open),
      available_volunteers: Number(volunteers.rows[0].available),
      shelter_capacity: Number(shelters.rows[0].total_capacity),
      shelter_available_beds: Number(shelters.rows[0].available_beds),
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getSummary };
