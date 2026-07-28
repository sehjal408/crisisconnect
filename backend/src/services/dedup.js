// ============================================================
// Cross-source de-duplication
// ------------------------------------------------------------
// The same real-world event can arrive from more than one source — most often a
// citizen report of something an official feed already lists (e.g. a wildfire the
// BC Wildfire Service already has). Left alone, that shows two markers for one
// event. This pass detects same-type incidents from DIFFERENT sources within a
// short distance and merges the lower-priority one into a canonical one by setting
// `duplicate_of`. Duplicates are hidden everywhere (the list/map endpoints already
// filter `duplicate_of IS NULL`); nothing is deleted, so a merge is reversible.
//
// Design notes:
//  - Only cross-source pairs merge (a feed is already deduped within itself by
//    external_id, so two same-source rows are genuinely distinct events). Two
//    citizen reports may also merge, since they share no IDs.
//  - Canonical = the row worth keeping: official feed > citizen, verified > pending,
//    higher severity, then oldest (stable).
//  - `keep_distinct` (set when an admin un-merges) means "never auto-merge again".
//  - Idempotent: safe to run after every ingest and after a citizen report is
//    promoted to an incident.
// ============================================================
const db = require("../config/db");

const MERGE_KM = Number(process.env.DEDUP_KM) || 3;
const SEV_RANK = { critical: 4, high: 3, medium: 2, low: 1 };

function haversineKm(aLat, aLon, bLat, bLon) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// Higher score = better canonical (kept over its duplicates).
function canonicalScore(i) {
  return (i.source !== "citizen" ? 1000 : 0)
    + (i.status === "verified" ? 100 : 0)
    + (SEV_RANK[i.severity] || 0) * 10;
}

// Same event? Same type + close, and either different sources or both citizen.
function mergeable(a, b) {
  if (a.type !== b.type) return false;
  if (!(a.source !== b.source || (a.source === "citizen" && b.source === "citizen"))) return false;
  if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) return false;
  return haversineKm(a.latitude, a.longitude, b.latitude, b.longitude) <= MERGE_KM;
}

async function runDedup() {
  await db.ready;
  const { rows } = await db.query(
    `SELECT id, type, latitude, longitude, severity, status, source, duplicate_of, keep_distinct
       FROM incidents WHERE status <> 'dismissed'`
  );
  const byId = new Map(rows.map((r) => [r.id, r]));
  let released = 0;

  // 1) Release duplicates whose canonical is gone, dismissed, or itself a duplicate.
  const releaseIds = [];
  for (const r of rows) {
    if (r.duplicate_of != null) {
      const parent = byId.get(r.duplicate_of);
      if (!parent || parent.duplicate_of != null) { releaseIds.push(r.id); r.duplicate_of = null; }
    }
  }
  if (releaseIds.length) {
    await db.query(`UPDATE incidents SET duplicate_of = NULL WHERE id = ANY($1)`, [releaseIds]);
    released = releaseIds.length;
  }

  // 2) Cluster currently-unmerged incidents by type, greedy from the best canonical.
  const groups = {};
  for (const r of rows) if (r.duplicate_of == null) (groups[r.type] ||= []).push(r);

  const assignments = [];
  for (const list of Object.values(groups)) {
    list.sort((a, b) => canonicalScore(b) - canonicalScore(a) || a.id - b.id);
    const consumed = new Set();
    for (const seed of list) {
      if (consumed.has(seed.id)) continue; // seed already merged into an earlier one
      for (const other of list) {
        if (other.id === seed.id || consumed.has(other.id) || other.keep_distinct) continue;
        if (mergeable(seed, other)) {
          assignments.push({ childId: other.id, parentId: seed.id });
          consumed.add(other.id);
        }
      }
    }
  }
  for (const { childId, parentId } of assignments) {
    await db.query(`UPDATE incidents SET duplicate_of = $1, updated_at = now() WHERE id = $2`, [parentId, childId]);
  }

  if (assignments.length || released) {
    console.log(`[dedup] merged=${assignments.length} released=${released} (≤${MERGE_KM}km)`);
  }
  return { merged: assignments.length, released };
}

module.exports = { runDedup, haversineKm };
