import { useState } from "react";
import * as Icons from "lucide-react";
import { MapPin, FileText, Radio, Activity, CircleDot, Navigation } from "lucide-react";
import { SEVERITY, INCIDENT_TYPE, fullDate, titleCase } from "../lib/meta";
import { Drawer, Badge, Button, DetailRow } from "./ui";
import LocationModal from "./LocationModal";

export default function IncidentDetailModal({ open, onClose, incident }) {
  const [showMap, setShowMap] = useState(false);
  if (!incident) return null;

  const t = INCIDENT_TYPE[incident.type] || INCIDENT_TYPE.other;
  const Icon = Icons[t.icon] || Icons.CircleAlert;
  const sev = SEVERITY[incident.severity] || { label: incident.severity, color: "#8a97a3" };
  const tone = incident.severity === "critical" ? "red" : incident.severity === "high" ? "amber" : "slate";
  const coords =
    incident.latitude != null ? `${Number(incident.latitude).toFixed(3)}, ${Number(incident.longitude).toFixed(3)}` : "British Columbia";

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        icon={Icon}
        title={incident.title}
        subtitle={`${t.label} · updated ${fullDate(incident.updated_at)}`}
        headerRight={<Badge tone={tone} dot>{sev.label}</Badge>}
      >
        <div className="divide-y divide-line">
          {incident.description && <DetailRow icon={FileText} label="Details">{incident.description}</DetailRow>}
          <DetailRow icon={Activity} label="Severity">{sev.label}</DetailRow>
          <DetailRow icon={Radio} label="Source">{incident.source || "—"}</DetailRow>
          {incident.status && <DetailRow icon={CircleDot} label="Status">{titleCase(incident.status)}</DetailRow>}
          <DetailRow icon={MapPin} label="Location">{coords}</DetailRow>
        </div>

        {incident.latitude != null && (
          <Button icon={Navigation} className="mt-5 w-full" onClick={() => setShowMap(true)}>
            Show on map
          </Button>
        )}
      </Drawer>

      <LocationModal
        open={showMap}
        onClose={() => setShowMap(false)}
        title={incident.title}
        latitude={incident.latitude}
        longitude={incident.longitude}
      />
    </>
  );
}
