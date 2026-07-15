// DriveBC — road events via the official Open511 API (B.C. government, no key).
// Docs: https://www.open511.gov.bc.ca/  API: https://api.open511.gov.bc.ca/events
// We surface significant events (incidents / weather / road conditions / major)
// rather than every minor construction notice.
const { getJson, inBC, centroid } = require("../geo");

const URL = "https://api.open511.gov.bc.ca/events?format=json&status=ACTIVE&limit=500";

function severity(s) {
  s = String(s || "").toUpperCase();
  if (s === "MAJOR") return "high";
  if (s === "MODERATE") return "medium";
  return "low";
}

async function fetchDriveBC() {
  const data = await getJson(URL);
  const out = [];
  for (const e of data.events || []) {
    if (String(e.status || "").toUpperCase() !== "ACTIVE") continue;
    const type = String(e.event_type || "").toUpperCase();
    const sev = String(e.severity || "").toUpperCase();
    // significant only
    if (!(type === "INCIDENT" || type === "WEATHER_CONDITION" || type === "ROAD_CONDITION" || sev === "MAJOR")) continue;

    const pt = centroid(e.geography);
    if (!pt || !inBC(pt.lat, pt.lon)) continue;

    const road = (e.roads && e.roads[0] && e.roads[0].name) || "";
    out.push({
      external_id: String(e.id),
      title: e.headline ? `${e.headline}${road ? ` — ${road}` : ""}` : `Road ${type.toLowerCase().replace(/_/g, " ")}`,
      type: "road_closure",
      description: `${e.description || e.headline || "Road event"} Source: DriveBC.`,
      latitude: pt.lat,
      longitude: pt.lon,
      severity: severity(sev),
      source: "DriveBC",
    });
  }
  return out;
}

module.exports = { key: "drivebc", name: "DriveBC roads", fetch: fetchDriveBC };
