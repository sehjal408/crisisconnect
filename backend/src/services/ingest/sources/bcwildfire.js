// BC Wildfire Service — active fires, public ArcGIS FeatureServer (GeoJSON, no key).
// Layer: BCWS_ActiveFires_PublicView. We surface SIGNIFICANT active fires only
// (extinguished "Out" fires and sub-hectare spot fires are filtered out) so the
// map stays meaningful rather than showing hundreds of tiny points.
const { getJson, inBC } = require("../geo");

const URL =
  "https://services6.arcgis.com/ubm4tcTYICKBpist/arcgis/rest/services/" +
  "BCWS_ActiveFires_PublicView/FeatureServer/0/query" +
  "?where=1%3D1&outFields=*&outSR=4326&returnGeometry=true&f=geojson&resultRecordCount=1000";

function severity(sizeHa, ofNote, status) {
  if (ofNote || sizeHa >= 1000) return "critical";
  if (sizeHa >= 100) return "high";
  if (sizeHa >= 1) return "medium";
  if (/out of control/i.test(status)) return "medium";
  return "low";
}

async function fetchBCWildfire() {
  const data = await getJson(URL);
  const out = [];
  for (const f of data.features || []) {
    const p = f.properties || {};
    const c = (f.geometry || {}).coordinates || [];
    const lon = c[0] != null ? c[0] : p.LONGITUDE;
    const lat = c[1] != null ? c[1] : p.LATITUDE;
    if (!inBC(lat, lon)) continue;

    const status = String(p.FIRE_STATUS || "Active");
    const size = Number(p.CURRENT_SIZE) || 0;
    const ofNote = String(p.FIRE_OF_NOTE_IND || "").toUpperCase() === "Y";

    // significant active fires only
    if (/^out$/i.test(status)) continue;
    if (!(ofNote || size >= 1 || /out of control/i.test(status))) continue;

    const num = p.FIRE_NUMBER || p.FIRE_ID || p.OBJECTID;
    if (num == null) continue;
    const where = p.GEOGRAPHIC_DESCRIPTION || p.INCIDENT_NAME || "";

    out.push({
      external_id: String(num),
      title: `Wildfire ${num}` + (where ? ` — ${where}` : ""),
      type: "wildfire",
      description:
        `${status} wildfire${ofNote ? " (fire of note)" : ""}, ${size} ha` +
        (where ? `, ${where}` : "") + ". Source: BC Wildfire Service.",
      latitude: lat,
      longitude: lon,
      severity: severity(size, ofNote, status),
      source: "BC Wildfire Service",
    });
  }
  return out;
}

module.exports = { key: "bcwildfire", name: "BC Wildfire Service", source: "BC Wildfire Service", fetch: fetchBCWildfire };
