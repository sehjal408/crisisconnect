// Air Quality Health Index (AQHI) — ECCC MSC GeoMet, aqhi-observations-realtime.
// Only elevated readings (AQHI >= 7, "high risk") become incidents; each station
// keys on its location so re-fetches update the same marker with the latest value.
const { BC, getJson, inBC } = require("../geo");

const URL =
  "https://api.weather.gc.ca/collections/aqhi-observations-realtime/items?f=json&limit=2000" +
  `&bbox=${BC.minLon},${BC.minLat},${BC.maxLon},${BC.maxLat}`;

function severity(v) {
  if (v >= 10) return "critical";
  if (v >= 7) return "high";
  if (v >= 4) return "medium";
  return "low";
}

async function fetchAQHI() {
  const data = await getJson(URL);
  // keep the latest observation per station
  const latest = new Map();
  for (const f of data.features || []) {
    const p = f.properties || {};
    const v = Number(p.aqhi);
    if (!Number.isFinite(v) || !p.location_id) continue;
    const dt = p.observation_datetime || "";
    const prev = latest.get(p.location_id);
    if (!prev || dt > prev.dt) latest.set(p.location_id, { p, v, dt, geom: f.geometry });
  }

  const out = [];
  for (const { p, v, geom } of latest.values()) {
    if (v < 7) continue; // only high-risk air quality is an "incident"
    const c = (geom || {}).coordinates || [];
    const lon = c[0], lat = c[1];
    if (!inBC(lat, lon)) continue;
    out.push({
      external_id: `aqhi-${p.location_id}`,
      title: `Air quality — ${p.location_name_en} (AQHI ${Math.round(v)})`,
      type: "air_quality",
      description: `Air Quality Health Index ${v.toFixed(1)} at ${p.location_name_en}. Source: Environment Canada (AQHI).`,
      latitude: lat,
      longitude: lon,
      severity: severity(v),
      source: "Environment Canada (AQHI)",
    });
  }
  return out;
}

module.exports = { key: "aqhi", name: "Air Quality (AQHI)", fetch: fetchAQHI };
