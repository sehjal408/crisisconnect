// Floods — BC River Forecast Centre advisories & warnings, published as the public
// ArcGIS layer "BC_Flood_Advisory_and_Warning_Notifications". Basin polygons are
// pinned to their centroid.
const { getJson, inBC, centroid } = require("../geo");

const URL =
  "https://services6.arcgis.com/ubm4tcTYICKBpist/arcgis/rest/services/" +
  "BC_Flood_Advisory_and_Warning_Notifications_(Public_View)/FeatureServer/0/query" +
  "?where=1%3D1&outFields=*&outSR=4326&returnGeometry=true&f=geojson&resultRecordCount=500";

// The layer's "Advisory" field encodes the level (1 advisory, 2 watch, 3 warning).
function level(a) {
  const n = Number(a);
  if (n >= 3) return { word: "warning", sev: "critical" };
  if (n === 2) return { word: "watch", sev: "high" };
  return { word: "advisory", sev: "medium" };
}

async function fetchBCFlood() {
  const data = await getJson(URL);
  // The layer is a notifications layer split into many sub-basin polygons; group
  // them by region so a broad advisory is ONE incident, not hundreds.
  const regions = new Map(); // Major_Basin -> { adv, pts: [] }
  for (const f of data.features || []) {
    const p = f.properties || {};
    const pt = centroid(f.geometry);
    if (!pt || !inBC(pt.lat, pt.lon)) continue;
    const major = p.Major_Basin || "Unknown basin";
    const r = regions.get(major) || { adv: 0, pts: [] };
    r.adv = Math.max(r.adv, Number(p.Advisory) || 0);
    r.pts.push(pt);
    regions.set(major, r);
  }

  const out = [];
  for (const [major, r] of regions) {
    const lat = r.pts.reduce((s, p) => s + p.lat, 0) / r.pts.length;
    const lon = r.pts.reduce((s, p) => s + p.lon, 0) / r.pts.length;
    const { word, sev } = level(r.adv);
    out.push({
      external_id: `flood-${major}`,
      title: `Flood ${word} — ${major}`,
      type: "flood",
      description: `Flood ${word} in effect for the ${major} region. Source: BC River Forecast Centre.`,
      latitude: lat,
      longitude: lon,
      severity: sev,
      source: "BC River Forecast Centre",
    });
  }
  return out;
}

module.exports = { key: "bcflood", name: "BC River Forecast (floods)", source: "BC River Forecast Centre", fetch: fetchBCFlood };
