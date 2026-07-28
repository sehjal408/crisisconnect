import { useEffect, useState } from "react";
import { House, MapPin, BedDouble, Navigation, PawPrint, Accessibility, HeartPulse, Minus, Plus, Pencil, DoorOpen, DoorClosed, Users, UserPlus } from "lucide-react";
import { SHELTER_STATUS, REQUEST_TYPE } from "../lib/meta";
import { shelters as sheltersApi, requests as requestsApi } from "../api/services";
import { Drawer, Badge, DetailRow, Button } from "./ui";
import LocationModal from "./LocationModal";

export default function ShelterDetailModal({ open, onClose, shelter, role = "citizen", requests = [], onChanged, onEdit }) {
  const [showMap, setShowMap] = useState(false);
  const [sh, setSh] = useState(shelter);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setSh(shelter); }, [shelter]);
  if (!sh) return null;

  const isAdmin = role === "admin";
  const st = SHELTER_STATUS[sh.status] || { label: sh.status, tone: "slate" };
  const pct = sh.capacity ? (sh.occupied_beds / sh.capacity) * 100 : 0;
  const hasAmenity = sh.pet_friendly || sh.accessibility_support || sh.medical_support;

  const occupants = requests.filter((r) => r.shelter_id === sh.id);
  const waiting = requests.filter((r) => r.request_type === "shelter" && !r.shelter_id && !["resolved", "closed"].includes(r.status));

  async function save(patch) {
    setBusy(true);
    try {
      const updated = await sheltersApi.update(sh.id, patch);
      setSh(updated);
      await onChanged?.();
    } finally { setBusy(false); }
  }
  const adjust = (delta) => save({ occupied_beds: Math.max(0, Math.min(sh.capacity, sh.occupied_beds + delta)) });
  const toggleStatus = () => save({ status: sh.status === "closed" ? "open" : "closed" });

  async function placeHere(reqId) {
    setBusy(true);
    try {
      const res = await requestsApi.place(reqId, sh.id);
      if (res.shelter) setSh(res.shelter);
      await onChanged?.();
    } finally { setBusy(false); }
  }

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        icon={House}
        title={sh.name}
        subtitle={sh.address}
        headerRight={<Badge tone={st.tone} dot>{st.label}</Badge>}
      >
        <div className="mb-4 rounded-2xl bg-line-soft/60 p-4">
          <p className="text-[28px] font-bold leading-none text-ink">
            {sh.available_beds}<span className="text-[15px] font-medium text-muted"> / {sh.capacity} beds free</span>
          </p>
          <p className="mt-1 text-[12px] text-muted">{sh.occupied_beds} occupied</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: sh.status === "full" ? "#ef9b3e" : sh.status === "closed" ? "#94a6b6" : "#16a394" }} />
          </div>

          {isAdmin && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1 rounded-full bg-white p-1 hairline">
                <button disabled={busy || sh.occupied_beds <= 0} onClick={() => adjust(-1)} className="grid h-7 w-7 place-items-center rounded-full text-body hover:bg-line-soft disabled:opacity-40"><Minus size={15} /></button>
                <span className="min-w-[52px] text-center text-[12.5px] font-semibold text-ink">{sh.occupied_beds} in</span>
                <button disabled={busy || sh.occupied_beds >= sh.capacity} onClick={() => adjust(1)} className="grid h-7 w-7 place-items-center rounded-full text-body hover:bg-line-soft disabled:opacity-40"><Plus size={15} /></button>
              </div>
              <Button size="sm" variant="subtle" icon={sh.status === "closed" ? DoorOpen : DoorClosed} loading={busy} onClick={toggleStatus}>
                {sh.status === "closed" ? "Reopen" : "Close"}
              </Button>
              <Button size="sm" variant="ghost" icon={Pencil} onClick={() => onEdit?.(sh)}>Edit</Button>
            </div>
          )}
        </div>

        <div className="divide-y divide-line">
          <DetailRow icon={MapPin} label="Address">
            <div className="flex flex-wrap items-center gap-2">
              <span>{sh.address}</span>
              <button onClick={() => setShowMap(true)} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-teal-600 hover:underline">
                <Navigation size={12} /> View on map
              </button>
            </div>
          </DetailRow>
          <DetailRow icon={BedDouble} label="Amenities">
            <div className="flex flex-wrap gap-1.5">
              {sh.pet_friendly && <Badge tone="slate"><PawPrint size={12} /> Pet-friendly</Badge>}
              {sh.accessibility_support && <Badge tone="slate"><Accessibility size={12} /> Accessible</Badge>}
              {sh.medical_support && <Badge tone="slate"><HeartPulse size={12} /> Medical</Badge>}
              {!hasAmenity && <span className="text-[13px] text-muted">Standard facilities</span>}
            </div>
          </DetailRow>
          {isAdmin && (
            <DetailRow icon={Users} label={`Placed here (${occupants.length})`}>
              {occupants.length ? (
                <ul className="space-y-1">
                  {occupants.map((r) => (
                    <li key={r.id} className="text-[13px] text-body">
                      {(REQUEST_TYPE[r.request_type] || {}).label || r.request_type} · {r.citizen_name || "citizen"}
                      {r.affected_count > 1 ? ` · ${r.affected_count} people` : ""}
                    </li>
                  ))}
                </ul>
              ) : <span className="text-[13px] text-muted">No one placed here yet.</span>}
            </DetailRow>
          )}
        </div>

        {isAdmin && waiting.length > 0 && sh.status !== "closed" && (
          <div className="mt-4">
            <p className="mb-2 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-muted">
              <UserPlus size={13} /> Waiting for shelter
            </p>
            <div className="space-y-2">
              {waiting.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl hairline p-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] text-body">{r.description}</p>
                    <p className="text-[12px] text-muted">{r.citizen_name || "citizen"}{r.affected_count > 1 ? ` · ${r.affected_count} people` : ""}</p>
                  </div>
                  <Button size="sm" variant="accent" loading={busy} disabled={sh.available_beds <= 0} onClick={() => placeHere(r.id)}>
                    {sh.available_beds <= 0 ? "Full" : "Place here"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </Drawer>

      <LocationModal
        open={showMap}
        onClose={() => setShowMap(false)}
        title={sh.name}
        address={sh.address}
        latitude={sh.latitude}
        longitude={sh.longitude}
      />
    </>
  );
}
