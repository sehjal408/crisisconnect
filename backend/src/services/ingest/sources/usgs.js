// USGS Earthquakes — free public GeoJSON feed, no API key.
// Docs: https://earthquake.usgs.gov/fdsnws/event/1/
const { BC, getJson, inBC } = require("../geo");

function severityForMag(mag) {
  if (mag >= 6) return "critical";
  if (mag >= 5) return "high";
  if (mag >= 4) return "medium";
  return "low";
}

async function fetchUSGS() {
  const start = new Date(Date.now() - 30 * 86400000).toISOString(); // last 30 days
  const url =
    "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson" +
    `&starttime=${start}&minmagnitude=2.5&orderby=time&limit=100` +
    `&minlatitude=${BC.minLat}&maxlatitude=${BC.maxLat}` +
    `&minlongitude=${BC.minLon}&maxlongitude=${BC.maxLon}`;

  const data = await getJson(url);
  const out = [];
  for (const f of data.features || []) {
    const p = f.properties || {};
    const c = (f.geometry || {}).coordinates || [];
    const lon = c[0], lat = c[1], depth = c[2];
    if (!inBC(lat, lon)) continue; // B.C. only (drops Alaska-panhandle quakes)
    const mag = typeof p.mag === "number" ? p.mag : null;
    const magLabel = mag != null ? mag.toFixed(1) : "?";
    out.push({
      external_id: String(f.id),
      title: p.place ? `M${magLabel} — ${p.place}` : `M${magLabel} earthquake`,
      type: "earthquake",
      description:
        `Magnitude ${magLabel} earthquake` +
        (p.place ? ` near ${p.place}` : "") +
        (depth != null ? `, depth ${Math.round(depth)} km` : "") +
        ". Source: USGS.",
      latitude: lat,
      longitude: lon,
      severity: severityForMag(mag ?? 0),
      source: "USGS",
    });
  }
  return out;
}

module.exports = { key: "usgs", name: "USGS earthquakes", fetch: fetchUSGS };
