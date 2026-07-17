const pool = require("../config/db");

// Public "network pulse" — powers the live backdrop on the sign-in screen.
// Deliberately unauthenticated and privacy-safe: it exposes ONLY aggregate
// counts plus incident dots (type / severity / coordinates), all of which come
// from public government feeds. No citizen requests, no personal data, no titles.
async function pulse(req, res, next) {
  try {
    const [points, counts, feeds, shelters] = await Promise.all([
      pool.query(
        `SELECT type, severity, latitude, longitude
         FROM incidents
         WHERE latitude IS NOT NULL
         ORDER BY updated_at DESC
         LIMIT 300`
      ),
      pool.query(
        `SELECT COUNT(*)::int AS incidents,
                COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical
         FROM incidents`
      ),
      pool.query(
        `SELECT COUNT(DISTINCT source)::int AS feeds
         FROM incidents WHERE external_id IS NOT NULL`
      ),
      pool.query(
        `SELECT COUNT(*)::int AS open FROM shelters WHERE status <> 'closed'`
      ),
    ]);
    return res.json({
      counts: {
        incidents: counts.rows[0].incidents,
        critical: counts.rows[0].critical,
        feeds: feeds.rows[0].feeds,
        shelters_open: shelters.rows[0].open,
      },
      points: points.rows,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { pulse };
