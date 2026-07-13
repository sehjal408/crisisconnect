import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { SEVERITY, INCIDENT_TYPE, SHELTER_STATUS, titleCase } from "../lib/meta";

function incidentIcon(sev, pulse) {
  const c = SEVERITY[sev]?.color || "#8a97a3";
  return L.divIcon({
    className: "",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
    html: `<span style="position:relative;display:grid;place-items:center;width:24px;height:24px">
      ${pulse ? `
        <span style="position:absolute;width:24px;height:24px;border-radius:9999px;border:2px solid ${c};animation:sonar 2.2s ease-out infinite"></span>
        <span style="position:absolute;width:24px;height:24px;border-radius:9999px;border:2px solid ${c};animation:sonar 2.2s ease-out infinite;animation-delay:1.1s"></span>
      ` : ""}
      <span style="width:18px;height:18px;border-radius:9999px;background:${c};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.32)"></span>
    </span>`,
  });
}

function shelterIcon(status) {
  const c = status === "open" ? "#16a394" : status === "full" ? "#ef9b3e" : "#94a6b6";
  return L.divIcon({
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
    html: `<span style="display:grid;place-items:center;width:28px;height:28px;border-radius:9px;background:#fff;border:2px solid ${c};box-shadow:0 3px 8px rgba(0,0,0,.2)">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9"/><path d="M9 20v-6h6v6"/></svg>
    </span>`,
  });
}

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) {
      map.setView(points[0], 11);
    } else {
      map.fitBounds(points, { padding: [48, 48] });
    }
  }, [map, points]);
  return null;
}

export default function CrisisMap({ incidents = [], shelters = [], height = 460, onSelectIncident, focus, className }) {
  const mapRef = useRef(null);
  const markerRefs = useRef({});
  const points = useMemo(
    () => [...incidents, ...shelters].map((p) => [p.latitude, p.longitude]).filter((p) => p[0] != null),
    [incidents, shelters]
  );

  // Fly to a focused incident/shelter and open its popup when `focus` changes.
  useEffect(() => {
    if (!focus || !mapRef.current || focus.latitude == null) return;
    mapRef.current.flyTo([focus.latitude, focus.longitude], 11, { duration: 0.8 });
    const m = markerRefs.current[`${focus.kind}${focus.id}`];
    if (m) setTimeout(() => m.openPopup(), 400);
  }, [focus]);

  return (
    <div
      className={["isolate overflow-hidden rounded-[20px] hairline shadow-soft", className].filter(Boolean).join(" ")}
      style={height != null ? { height } : undefined}
    >
      <MapContainer
        ref={mapRef}
        center={[53.7, -124.5]}
        zoom={5}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
        zoomControl
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap &copy; CARTO'
        />
        <FitBounds points={points} />

        {incidents.map((i) => (
          <Marker
            key={`i${i.id}`}
            ref={(el) => { if (el) markerRefs.current[`i${i.id}`] = el; }}
            position={[i.latitude, i.longitude]}
            icon={incidentIcon(i.severity, i.severity === "critical")}
            eventHandlers={{ click: () => onSelectIncident?.(i) }}
          >
            <Popup>
              <div style={{ minWidth: 180 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 999, background: SEVERITY[i.severity]?.color }} />
                  <strong style={{ color: "#0b1521", fontSize: 13 }}>{i.title}</strong>
                </div>
                <div style={{ fontSize: 12, color: "#5a6b7b" }}>
                  {INCIDENT_TYPE[i.type]?.label || titleCase(i.type)} · {SEVERITY[i.severity]?.label}
                </div>
                {i.description && <div style={{ fontSize: 12, color: "#5a6b7b", marginTop: 6 }}>{i.description}</div>}
                {i.source && <div style={{ fontSize: 11, color: "#8a97a3", marginTop: 6 }}>Source: {i.source}</div>}
              </div>
            </Popup>
          </Marker>
        ))}

        {shelters.map((s) => (
          <Marker key={`s${s.id}`} ref={(el) => { if (el) markerRefs.current[`s${s.id}`] = el; }} position={[s.latitude, s.longitude]} icon={shelterIcon(s.status)}>
            <Popup>
              <div style={{ minWidth: 180 }}>
                <strong style={{ color: "#0b1521", fontSize: 13 }}>{s.name}</strong>
                <div style={{ fontSize: 12, color: "#5a6b7b", marginTop: 2 }}>{s.address}</div>
                <div style={{ fontSize: 12, color: "#0f877b", fontWeight: 600, marginTop: 6 }}>
                  {s.available_beds} of {s.capacity} beds free · {SHELTER_STATUS[s.status]?.label}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
