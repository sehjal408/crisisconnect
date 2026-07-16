import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Flame, Waves, Activity, CloudLightning, TriangleAlert, Siren, Wind, CircleAlert, Home,
} from "lucide-react";
import { SEVERITY, INCIDENT_TYPE, SHELTER_STATUS, titleCase } from "../lib/meta";

// Marker language: the fill colour is the SEVERITY (triage urgency) and the glyph
// is the incident TYPE, so categories read at a glance instead of identical dots.
const TYPE_ICON = {
  wildfire: Flame, flood: Waves, earthquake: Activity, weather: CloudLightning,
  road_closure: TriangleAlert, evacuation: Siren, air_quality: Wind, other: CircleAlert,
};

// Icons are cached and shared across markers (recreating one per pin per render is
// the main cause of jank with 100+ markers).
const ICON_CACHE = {};
function incidentIcon(type, sev, big) {
  const key = `${type}:${sev}:${big ? 1 : 0}`;
  if (ICON_CACHE[key]) return ICON_CACHE[key];
  const c = SEVERITY[sev]?.color || "#8a97a3";
  const Icon = TYPE_ICON[type] || CircleAlert;
  const glyph = renderToStaticMarkup(<Icon size={13} color="#fff" strokeWidth={2.6} />);
  const ring = big
    ? `<span style="position:absolute;width:30px;height:30px;border-radius:50%;border:2px solid ${c};opacity:.4"></span>`
    : "";
  const icon = L.divIcon({
    className: "",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -14],
    html: `<span style="position:relative;display:grid;place-items:center;width:30px;height:30px">
      ${ring}
      <span style="display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:${c};border:2.5px solid #fff;box-shadow:0 2px 7px rgba(11,21,33,.35)">${glyph}</span>
    </span>`,
  });
  ICON_CACHE[key] = icon;
  return icon;
}

const SHELTER_CACHE = {};
function shelterIcon(status) {
  if (SHELTER_CACHE[status]) return SHELTER_CACHE[status];
  const c = status === "open" ? "#16a394" : status === "full" ? "#ef9b3e" : "#94a6b6";
  const glyph = renderToStaticMarkup(<Home size={15} color={c} strokeWidth={2.4} />);
  const icon = L.divIcon({
    className: "",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
    html: `<span style="display:grid;place-items:center;width:30px;height:30px;border-radius:9px;background:#fff;border:2px solid ${c};box-shadow:0 3px 8px rgba(11,21,33,.22)">${glyph}</span>`,
  });
  SHELTER_CACHE[status] = icon;
  return icon;
}

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) map.setView(points[0], 11);
    else map.fitBounds(points, { padding: [48, 48] });
  }, [map, points]);
  return null;
}

export default function CrisisMap({ incidents = [], shelters = [], height = 460, onSelectIncident, focus, className }) {
  const mapRef = useRef(null);
  const markerRefs = useRef({});
  const [showShelters, setShowShelters] = useState(true);
  const points = useMemo(
    () => [...incidents, ...shelters].map((p) => [p.latitude, p.longitude]).filter((p) => p[0] != null),
    [incidents, shelters]
  );

  useEffect(() => {
    if (!focus || !mapRef.current || focus.latitude == null) return;
    mapRef.current.flyTo([focus.latitude, focus.longitude], 11, { duration: 0.8 });
    const m = markerRefs.current[`${focus.kind}${focus.id}`];
    if (m) setTimeout(() => m.openPopup(), 400);
  }, [focus]);

  return (
    <div
      className={["relative isolate overflow-hidden rounded-[20px] hairline shadow-soft", className].filter(Boolean).join(" ")}
      style={height != null ? { height } : undefined}
    >
      {/* distinct floating shelter toggle — kept separate from the incident chips */}
      {shelters.length > 0 && (
        <button
          type="button"
          onClick={() => setShowShelters((v) => !v)}
          title={showShelters ? "Hide shelters" : "Show shelters"}
          className="absolute right-3 top-3 z-[1000] inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-white/90 px-3 py-1.5 text-[12.5px] font-semibold shadow-soft backdrop-blur transition hover:bg-white"
          style={{ color: showShelters ? "#0f877b" : "#8a97a3" }}
        >
          <Home size={14} style={{ color: showShelters ? "#16a394" : "#8a97a3" }} />
          Shelters
          <span
            className="grid min-w-[18px] place-items-center rounded-full px-1 text-[10.5px]"
            style={{ background: showShelters ? "#d3f1ea" : "#eef1f5", color: showShelters ? "#0f877b" : "#8a97a3" }}
          >
            {shelters.length}
          </span>
        </button>
      )}

      <MapContainer
        ref={mapRef}
        center={[53.7, -124.5]}
        zoom={5}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
        zoomControl
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap &copy; CARTO'
        />
        <FitBounds points={points} />

        {incidents.map((i) => (
          <Marker
            key={`i${i.id}`}
            ref={(el) => { if (el) markerRefs.current[`i${i.id}`] = el; }}
            position={[i.latitude, i.longitude]}
            icon={incidentIcon(i.type, i.severity, i.severity === "critical" || i.severity === "high")}
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

        {showShelters && shelters.map((s) => (
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
