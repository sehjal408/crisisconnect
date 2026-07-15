// Shared helpers for the live-feed ingestion adapters.

// Bounding box for British Columbia — used only to scope the upstream API queries
// (a rectangle is all their bbox params accept).
const BC = { minLat: 48.0, maxLat: 60.1, minLon: -139.1, maxLon: -114.0 };

// Simplified B.C. boundary (lon, lat) — a rectangle leaks in the Alaska panhandle
// (e.g. USGS quakes) and Yukon/Alberta edges, so the *final* accept test is a
// point-in-polygon against this outline. Coarse but keeps ingestion B.C.-only.
const BC_POLYGON = [
  [-114.05, 49.00], // SE corner (BC/AB/US)
  [-123.30, 49.00], // south border west to the coast (near Vancouver)
  [-123.10, 48.35], // Victoria / south Vancouver Island
  [-124.80, 48.30], // south Vancouver Island
  [-126.90, 49.80], // west Vancouver Island
  [-128.40, 51.60], // central coast
  [-131.20, 52.20],
  [-133.20, 53.30], // Haida Gwaii (SW)
  [-133.10, 54.20], // Haida Gwaii (N)
  [-130.50, 54.70], // mainland near Prince Rupert / start of AK border
  [-130.00, 56.00], // Stewart area
  [-132.20, 57.10], // up the Alaska-panhandle border (excludes panhandle)
  [-133.80, 58.20],
  [-136.20, 59.30],
  [-139.05, 60.00], // NW corner (BC/YT/AK)
  [-120.00, 60.00], // north border (60°N) east to the Alberta meridian
  [-120.00, 53.80], // down the Alberta border (120°W)
  // closes back to the SE corner along the Rockies diagonal
];

function pointInPolygon(lat, lon, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const hit = (yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

// True only when the point is inside British Columbia.
function inBC(lat, lon) {
  if (typeof lat !== "number" || typeof lon !== "number") return false;
  if (lat < BC.minLat || lat > BC.maxLat || lon < BC.minLon || lon > BC.maxLon) return false;
  return pointInPolygon(lat, lon, BC_POLYGON);
}

// Fetch JSON with a hard timeout so a slow/unreachable source can never hang the
// ingest run (the caller catches and skips that source).
async function getJson(url, { timeout = 12000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "CrisisConnect/0.1 (student project)", Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

// Representative point (average of all coordinate pairs) for a GeoJSON geometry —
// lets us pin polygon-shaped alerts (weather areas) as a single incident marker.
function centroid(geometry) {
  if (!geometry || !geometry.coordinates) return null;
  const pts = [];
  (function walk(a) {
    if (typeof a[0] === "number") { pts.push(a); return; }
    for (const x of a) walk(x);
  })(geometry.coordinates);
  if (!pts.length) return null;
  const lon = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const lat = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return { lat, lon };
}

module.exports = { BC, inBC, getJson, centroid };
