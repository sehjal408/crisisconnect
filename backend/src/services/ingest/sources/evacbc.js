// Evacuations — EmergencyInfoBC "Evacuation Orders and Alerts", published as a
// public ArcGIS layer. Order = mandatory (critical); Alert = be ready (high).
// Affected-area polygons are pinned to their centroid.
const { getJson, inBC, centroid } = require("../geo");

const URL =
  "https://services6.arcgis.com/ubm4tcTYICKBpist/arcgis/rest/services/" +
  "Evacuation_Orders_and_Alerts/FeatureServer/0/query" +
  "?where=1%3D1&outFields=*&outSR=4326&returnGeometry=true&f=geojson&resultRecordCount=1000";

async function fetchEvacBC() {
  const data = await getJson(URL);
  const out = [];
  for (const f of data.features || []) {
    const p = f.properties || {};
    const pt = centroid(f.geometry);
    if (!pt || !inBC(pt.lat, pt.lon)) continue;

    const isOrder = /order/i.test(String(p.ORDER_ALERT_STATUS || ""));
    const kind = isOrder ? "order" : "alert";
    const name = p.ORDER_ALERT_NAME || p.EVENT_NAME || "Evacuation";
    const homes = Number(p.MULTI_SOURCED_HOMES) || 0;
    out.push({
      external_id: `evac-${p.EMRG_OAA_SYSID || p.OBJECTID}`,
      title: `Evacuation ${kind} — ${name}`,
      type: "evacuation",
      description:
        `${p.EVENT_TYPE || "Emergency"} evacuation ${kind}` +
        (p.ISSUING_AGENCY ? ` (${p.ISSUING_AGENCY})` : "") +
        (homes ? `, ~${homes} homes affected` : "") +
        ". Source: EmergencyInfoBC.",
      latitude: pt.lat,
      longitude: pt.lon,
      severity: isOrder ? "critical" : "high",
      source: "EmergencyInfoBC",
    });
  }
  return out;
}

module.exports = { key: "evacbc", name: "EmergencyInfoBC (evacuations)", source: "EmergencyInfoBC", fetch: fetchEvacBC };
