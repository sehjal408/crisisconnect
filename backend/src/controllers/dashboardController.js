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

// Week 11: full operational analytics — composition + performance + trend.
async function getAnalytics(req, res, next) {
  try {
    const rows = (text) => pool.query(text).then((r) => r.rows);
    const [
      byType, bySeverity, bySource, incStatus, reqTotals, reqByPriority,
      timing, vols, shel, trend,
    ] = await Promise.all([
      rows(`SELECT type, COUNT(*)::int n FROM incidents WHERE duplicate_of IS NULL AND status<>'dismissed' GROUP BY type ORDER BY n DESC`),
      rows(`SELECT severity, COUNT(*)::int n FROM incidents WHERE duplicate_of IS NULL AND status<>'dismissed' GROUP BY severity`),
      rows(`SELECT source, COUNT(*)::int n FROM incidents WHERE duplicate_of IS NULL AND status<>'dismissed' AND source IS NOT NULL GROUP BY source ORDER BY n DESC`),
      rows(`SELECT
              COUNT(*) FILTER (WHERE status='pending')::int pending,
              COUNT(*) FILTER (WHERE status='verified')::int verified,
              (SELECT COUNT(*) FROM incidents WHERE duplicate_of IS NOT NULL)::int merged
            FROM incidents WHERE duplicate_of IS NULL AND status<>'dismissed'`),
      rows(`SELECT COUNT(*)::int total,
              COUNT(*) FILTER (WHERE status NOT IN ('resolved','closed'))::int open,
              COUNT(*) FILTER (WHERE status IN ('resolved','closed'))::int resolved
            FROM requests`),
      rows(`SELECT
              COUNT(*) FILTER (WHERE priority_score>=85)::int critical,
              COUNT(*) FILTER (WHERE priority_score>=60 AND priority_score<85)::int urgent,
              COUNT(*) FILTER (WHERE priority_score>=30 AND priority_score<60)::int standard,
              COUNT(*) FILTER (WHERE priority_score<30)::int low
            FROM requests`),
      rows(`SELECT
              AVG(EXTRACT(EPOCH FROM (a.assigned_at - r.created_at)))::int avg_assign_s,
              (AVG(EXTRACT(EPOCH FROM (r.resolved_at - r.created_at))) FILTER (WHERE r.resolved_at IS NOT NULL))::int avg_resolve_s
            FROM requests r LEFT JOIN assignments a ON a.request_id = r.id`),
      rows(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE availability='available')::int available FROM volunteers`),
      rows(`SELECT COALESCE(SUM(capacity),0)::int cap, COALESCE(SUM(occupied_beds),0)::int occ,
              COALESCE(SUM(available_beds),0)::int free,
              COUNT(*) FILTER (WHERE status='full')::int full,
              COUNT(*) FILTER (WHERE status='open')::int open, COUNT(*)::int total
            FROM shelters`),
      rows(`SELECT to_char(created_at::date,'YYYY-MM-DD') d, COUNT(*)::int n
              FROM requests WHERE created_at >= (now() - interval '13 days') GROUP BY 1`),
    ]);

    // Fill the trend to a continuous 14-day series (zero-fill gaps).
    const series = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      const hit = trend.find((x) => x.d === d);
      series.push({ date: d, value: hit ? hit.n : 0 });
    }

    const rt = reqTotals[0], t = timing[0], s = shel[0], st = incStatus[0];
    return res.json({
      incidents: {
        by_type: byType, by_severity: bySeverity, by_source: bySource,
        pending: st.pending, verified: st.verified, merged: st.merged,
      },
      requests: {
        total: rt.total, open: rt.open, resolved: rt.resolved,
        resolution_rate: rt.total ? Math.round((rt.resolved / rt.total) * 100) : 0,
        by_priority: reqByPriority[0],
        avg_assign_seconds: t.avg_assign_s, avg_resolve_seconds: t.avg_resolve_s,
      },
      volunteers: vols[0],
      shelters: { ...s, occupancy_rate: s.cap ? Math.round((s.occ / s.cap) * 100) : 0 },
      trend_requests: series,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getSummary, getAnalytics };
