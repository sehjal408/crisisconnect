import { useState } from "react";
import { House, MapPin, BedDouble, Navigation, PawPrint, Accessibility, HeartPulse } from "lucide-react";
import { SHELTER_STATUS } from "../lib/meta";
import { Drawer, Badge, DetailRow } from "./ui";
import LocationModal from "./LocationModal";

export default function ShelterDetailModal({ open, onClose, shelter }) {
  const [showMap, setShowMap] = useState(false);
  if (!shelter) return null;

  const st = SHELTER_STATUS[shelter.status] || { label: shelter.status, tone: "slate" };
  const pct = shelter.capacity ? (shelter.occupied_beds / shelter.capacity) * 100 : 0;
  const hasAmenity = shelter.pet_friendly || shelter.accessibility_support || shelter.medical_support;

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        icon={House}
        title={shelter.name}
        subtitle={shelter.address}
        headerRight={<Badge tone={st.tone} dot>{st.label}</Badge>}
      >
        <div className="mb-4 rounded-2xl bg-line-soft/60 p-4">
          <p className="text-[28px] font-bold leading-none text-ink">
            {shelter.available_beds}<span className="text-[15px] font-medium text-muted"> / {shelter.capacity} beds free</span>
          </p>
          <p className="mt-1 text-[12px] text-muted">{shelter.occupied_beds} occupied</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: shelter.status === "full" ? "#ef9b3e" : "#16a394" }} />
          </div>
        </div>

        <div className="divide-y divide-line">
          <DetailRow icon={MapPin} label="Address">
            <div className="flex flex-wrap items-center gap-2">
              <span>{shelter.address}</span>
              <button onClick={() => setShowMap(true)} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-teal-600 hover:underline">
                <Navigation size={12} /> View on map
              </button>
            </div>
          </DetailRow>
          <DetailRow icon={BedDouble} label="Amenities">
            <div className="flex flex-wrap gap-1.5">
              {shelter.pet_friendly && <Badge tone="slate"><PawPrint size={12} /> Pet-friendly</Badge>}
              {shelter.accessibility_support && <Badge tone="slate"><Accessibility size={12} /> Accessible</Badge>}
              {shelter.medical_support && <Badge tone="slate"><HeartPulse size={12} /> Medical</Badge>}
              {!hasAmenity && <span className="text-[13px] text-muted">Standard facilities</span>}
            </div>
          </DetailRow>
        </div>
      </Drawer>

      <LocationModal
        open={showMap}
        onClose={() => setShowMap(false)}
        title={shelter.name}
        address={shelter.address}
        latitude={shelter.latitude}
        longitude={shelter.longitude}
      />
    </>
  );
}
