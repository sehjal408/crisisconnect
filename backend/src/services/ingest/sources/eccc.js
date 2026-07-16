// Environment and Climate Change Canada — active public weather alerts.
// MSC GeoMet OGC API, collection "weather-alerts" (no key). Alerts are area
// polygons; we pin each to its centroid.
const { BC, getJson, centroid, inBC } = require("../geo");

const URL =
  "https://api.weather.gc.ca/collections/weather-alerts/items?f=json&limit=300" +
  `&bbox=${BC.minLon},${BC.minLat},${BC.maxLon},${BC.maxLat}`;

// weather-alerts has no numeric severity — derive from the colour band and the
// alert word (warning > watch > advisory/statement).
function severity(p) {
  const col = String(p.risk_colour_en || "").toLowerCase();
  if (col.includes("red")) return "critical";
  if (col.includes("orange")) return "high";
  const t = String(p.alert_type || "").toLowerCase();
  if (t.includes("warning")) return "high";
  if (col.includes("yellow") || t.includes("watch")) return "medium";
  return "low";
}

function cap(s) {
  s = String(s || "").trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

async function fetchECCC() {
  const data = await getJson(URL);
  const out = [];
  for (const f of data.features || []) {
    const p = f.properties || {};
    const status = String(p.status_en || "").toLowerCase();
    if (status && status.includes("test")) continue; // skip test alerts

    const pt = centroid(f.geometry);
    if (!pt || !inBC(pt.lat, pt.lon)) continue; // B.C. only (drops Yukon/Alberta edges)
    const id = p.id || p.feature_id || f.id;
    if (id == null) continue;

    const name = cap(p.alert_name_en || p.alert_type || "Weather alert");
    const area = p.feature_name_en || "";

    out.push({
      external_id: String(id),
      title: area ? `${name} — ${area}` : name,
      type: "weather",
      description: `${name}${area ? ` for ${area}` : ""}. Source: Environment Canada.`,
      latitude: pt.lat,
      longitude: pt.lon,
      severity: severity(p),
      source: "Environment Canada",
    });
  }
  return out;
}

module.exports = { key: "eccc", name: "Environment Canada weather", source: "Environment Canada", fetch: fetchECCC };
