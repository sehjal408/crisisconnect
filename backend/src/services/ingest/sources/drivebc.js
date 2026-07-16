// DriveBC — road events via the official Open511 API (B.C. government, no key).
// Docs: https://www.open511.gov.bc.ca/  API: https://api.open511.gov.bc.ca/events
// Open511's `headline` is just the generic type ("CONSTRUCTION"/"INCIDENT"), so we
// build a clear title from the descriptive `description` + the road name instead.
const { getJson, inBC, centroid } = require("../geo");

const URL = "https://api.open511.gov.bc.ca/events?format=json&status=ACTIVE&limit=500";

const SUBTYPE_LABEL = {
  ROAD_CONSTRUCTION: "Construction", ROAD_MAINTENANCE: "Maintenance", HAZARD: "Hazard",
  PLANNED_EVENT: "Planned event", ROAD_CONDITION: "Road condition", SPECIAL_EVENT: "Event",
};
const TYPE_LABEL = {
  INCIDENT: "Incident", CONSTRUCTION: "Construction", WEATHER_CONDITION: "Weather",
  ROAD_CONDITION: "Road condition", SPECIAL_EVENT: "Event",
};

function eventLabel(e) {
  const sub = (e.event_subtypes || [])[0];
  return SUBTYPE_LABEL[sub] || TYPE_LABEL[String(e.event_type || "").toUpperCase()] || "Road event";
}

function severity(s) {
  s = String(s || "").toUpperCase();
  if (s === "MAJOR") return "high";
  if (s === "MODERATE") return "medium";
  return "low";
}

// DriveBC descriptions read well ("Highway 1 … utility work between Roderick St and
// Cloverdale Ave"); clean the generic boilerplate and trim to a title length.
function cleanTitle(e, road) {
  let d = String(e.description || "").replace(/\s+/g, " ").trim();
  d = d.replace(/^\[Truncated\]\s*/i, "");             // DriveBC's own truncation marker
  d = d.replace(/\.{2,}/g, ". ");                      // "Coalmont Rd.. Bridge" -> "Coalmont Rd. Bridge"
  d = d.replace(/,?\s*in both directions/gi, "");
  d = d.replace(/,?\s*in the \w+ direction/gi, "");
  d = d.replace(/\s*Until .*$/i, "").replace(/\s*Starting .*$/i, "");
  d = d.replace(/\s*Watch for signage.*$/i, "").replace(/\s+/g, " ").trim();
  if (d.length > 95) {
    const cut = d.slice(0, 95);
    const b = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf(", "));
    d = (b > 45 ? cut.slice(0, b) : cut).trim();
  }
  d = d.replace(/[.,;:\s]+$/, "");
  if (!d) d = `${road || "Road"} — ${eventLabel(e).toLowerCase()}`;
  return d;
}

async function fetchDriveBC() {
  const data = await getJson(URL);
  const out = [];
  for (const e of data.events || []) {
    if (String(e.status || "").toUpperCase() !== "ACTIVE") continue;
    const type = String(e.event_type || "").toUpperCase();
    const sev = String(e.severity || "").toUpperCase();
    // significant events only (skip minor construction)
    if (!(type === "INCIDENT" || type === "WEATHER_CONDITION" || type === "ROAD_CONDITION" || sev === "MAJOR")) continue;

    const pt = centroid(e.geography);
    if (!pt || !inBC(pt.lat, pt.lon)) continue;

    const r = (e.roads || [])[0] || {};
    const road = r.name && r.name !== "Other Roads" ? r.name : "";
    const body = cleanTitle(e, road);
    // prefix the highway name when the cleaned text doesn't already mention it
    const title = road && !body.toLowerCase().includes(road.toLowerCase()) ? `${road} — ${body}` : body;

    out.push({
      external_id: String(e.id),
      title,
      type: "road_closure",
      description: `${e.description || title} Source: DriveBC.`,
      latitude: pt.lat,
      longitude: pt.lon,
      severity: severity(sev),
      source: "DriveBC",
    });
  }
  return out;
}

module.exports = { key: "drivebc", name: "DriveBC roads", source: "DriveBC", fetch: fetchDriveBC };
