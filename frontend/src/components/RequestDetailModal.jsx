import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import * as Icons from "lucide-react";
import { MapPin, Users, FileText, AlertTriangle, User, UserCheck, Navigation, Paperclip, Camera, Sparkles, House, X, ZoomIn } from "lucide-react";
import { REQUEST_TYPE, REQUEST_STATUS, ASSIGNMENT_STATUS, PRIORITY, priorityBand, fullDate } from "../lib/meta";
import { requests as requestsApi } from "../api/services";
import { mediaUrl } from "../api/client";
import { Drawer, Badge, StatusTimeline, DetailRow, Button, Select } from "./ui";
import LocationModal from "./LocationModal";
import PromoteIncidentModal from "./PromoteIncidentModal";
import PlaceShelterModal from "./PlaceShelterModal";

const FLOW = [
  { key: "pending", label: "Submitted", hint: "Waiting for an administrator to review." },
  { key: "reviewed", label: "Reviewed", hint: "An administrator has reviewed this req." },
  { key: "assigned", label: "Volunteer assigned", hint: "A volunteer has been assigned." },
  { key: "in_progress", label: "In progress", hint: "Help is on the way." },
  { key: "resolved", label: "Resolved", hint: "This request has been resolved." },
];

export default function RequestDetailModal({ open, onClose, request, role = "citizen", volunteers = [], onChanged }) {
  const [showMap, setShowMap] = useState(false);
  const [req, setReq] = useState(request);
  const [busy, setBusy] = useState(false);
  const [promote, setPromote] = useState(false);
  const [place, setPlace] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => { setReq(request); }, [request]);
  if (!req) return null;

  const type = REQUEST_TYPE[req.request_type] || REQUEST_TYPE.other;
  const Icon = Icons[type.icon] || Icons.CircleHelp;
  const st = REQUEST_STATUS[req.status] || { label: req.status, tone: "slate" };
  const band = priorityBand(req.priority_score);
  const pri = band ? PRIORITY[band] : null;
  const isClosed = req.status === "closed";
  const attachments = req.attachments || [];

  const isAdmin = role === "admin";
  const active = !["resolved", "closed"].includes(req.status);
  const assignedVol = req.assignment ? volunteers.find((v) => v.id === req.assignment.volunteer_id) : null;
  const showAdmin = isAdmin && (active || !req.incident_id);

  async function doAssign(volunteerId) {
    if (!volunteerId) return;
    setBusy(true);
    try {
      const a = await requestsApi.assign(req.id, Number(volunteerId));
      setReq((r) => ({ ...r, status: "assigned", assignment: { id: a.id, volunteer_id: a.volunteer_id, status: a.status } }));
      await onChanged?.();
    } finally { setBusy(false); }
  }
  async function doStatus(status) {
    setBusy(true);
    try {
      await requestsApi.setStatus(req.id, status);
      setReq((r) => ({ ...r, status }));
      await onChanged?.();
    } finally { setBusy(false); }
  }

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        icon={Icon}
        title={`${type.label} request`}
        subtitle={`#${req.id} · ${fullDate(req.created_at)}`}
        headerRight={<Badge tone={st.tone} dot>{st.label}</Badge>}
      >
        {/* status timeline */}
        <div className="rounded-2xl bg-line-soft/60 p-4">
          <p className="mb-3 text-[11.5px] font-semibold uppercase tracking-wide text-muted">Status</p>
          {isClosed ? (
            <div className="flex items-center gap-2 text-[13.5px] text-body">
              <span className="h-2.5 w-2.5 rounded-full bg-muted" /> This request was closed.
            </div>
          ) : (
            <StatusTimeline steps={FLOW} current={req.status} />
          )}
        </div>

        {/* admin actions — mirrors the queue so everything is doable from here */}
        {showAdmin && (
          <div className="mt-4 rounded-2xl border border-line p-4">
            <p className="mb-3 text-[11.5px] font-semibold uppercase tracking-wide text-muted">Admin actions</p>
            <div className="space-y-2.5">
              {active && (assignedVol ? (
                <div className="flex items-center gap-2 rounded-xl bg-teal-50 px-3 py-2 text-[13px] text-teal-600">
                  <UserCheck size={15} /> Assigned to {assignedVol.name}
                </div>
              ) : (
                <Select disabled={busy} defaultValue="" onChange={(e) => doAssign(e.target.value)}>
                  <option value="" disabled>Assign volunteer…</option>
                  {volunteers.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}{v.availability !== "available" ? " (busy)" : ""}</option>
                  ))}
                </Select>
              ))}
              <div className="flex flex-wrap gap-2">
                {req.status === "pending" && (
                  <Button size="sm" variant="subtle" loading={busy} onClick={() => doStatus("reviewed")}>Mark reviewed</Button>
                )}
                {active && <Button size="sm" variant="accent" loading={busy} onClick={() => doStatus("resolved")}>Resolve</Button>}
                {active && <Button size="sm" variant="ghost" loading={busy} onClick={() => doStatus("closed")}>Close</Button>}
                {!req.incident_id && (
                  <Button size="sm" variant="subtle" icon={AlertTriangle} loading={busy} onClick={() => setPromote(true)}>Create incident</Button>
                )}
                {req.request_type === "shelter" && active && (
                  <Button size="sm" variant="subtle" icon={House} loading={busy} onClick={() => setPlace(true)}>Place in shelter</Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* details */}
        <div className="mt-4 divide-y divide-line">
          <DetailRow icon={FileText} label="What's needed">{req.description}</DetailRow>
          <DetailRow icon={Users} label="People affected">{req.affected_count || 1}</DetailRow>
          {role !== "citizen" && req.priority_score != null && (
            <DetailRow icon={Sparkles} label="AI triage (suggested)">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  {pri && <Badge tone={pri.tone} dot>{pri.label}</Badge>}
                  <span className="text-[12px] text-muted">priority {req.priority_score}/100</span>
                </div>
                {req.ai_summary && <span className="text-[13px] text-body">{req.ai_summary}</span>}
              </div>
            </DetailRow>
          )}
          <DetailRow icon={MapPin} label="Location">
            <div className="flex flex-wrap items-center gap-2">
              <span>{req.address || "Not provided"}</span>
              {(req.address || req.latitude != null) && (
                <button onClick={() => setShowMap(true)} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-teal-600 hover:underline">
                  <Navigation size={12} /> View on map
                </button>
              )}
            </div>
          </DetailRow>
          {req.incident_title && <DetailRow icon={AlertTriangle} label="Related incident">{req.incident_title}</DetailRow>}
          {role !== "citizen" && req.citizen_name && <DetailRow icon={User} label="Requested by">{req.citizen_name}</DetailRow>}
          {req.assignment && (
            <DetailRow icon={UserCheck} label="Assignment">
              <Badge tone={(ASSIGNMENT_STATUS[req.assignment.status] || {}).tone || "slate"}>
                {(ASSIGNMENT_STATUS[req.assignment.status] || {}).label || req.assignment.status}
              </Badge>
            </DetailRow>
          )}
        </div>

        {/* attachments */}
        <div className="mt-4">
          <p className="mb-2 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-muted">
            <Paperclip size={13} /> Photos &amp; attachments
          </p>
          {attachments.length ? (
            <div className="grid grid-cols-3 gap-2">
              {attachments.map((a, i) => {
                const url = mediaUrl(a.url || a);
                return (
                  <button key={i} type="button" onClick={() => setLightbox(url)}
                    className="group relative h-24 w-full overflow-hidden rounded-xl hairline">
                    <img src={url} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
                    <span className="absolute inset-0 grid place-items-center bg-ink/0 text-white/0 transition group-hover:bg-ink/35 group-hover:text-white">
                      <ZoomIn size={18} />
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl bg-line-soft/60 px-3 py-3 text-[12.5px] text-muted">
              <Camera size={15} /> No photos attached.
            </div>
          )}
        </div>
      </Drawer>

      <LocationModal
        open={showMap}
        onClose={() => setShowMap(false)}
        title="Request location"
        address={req.address}
        latitude={req.latitude}
        longitude={req.longitude}
      />

      <PromoteIncidentModal
        open={promote}
        request={req}
        onClose={() => setPromote(false)}
        onCreated={(inc) => { setReq((r) => ({ ...r, incident_id: inc.id, incident_title: inc.title })); onChanged?.(); }}
      />
      <PlaceShelterModal
        open={place}
        request={req}
        onClose={() => setPlace(false)}
        onPlaced={(res) => { setReq((r) => ({ ...r, status: res?.request?.status || "resolved", shelter_id: res?.shelter?.id })); onChanged?.(); }}
      />

      {lightbox && createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-6 animate-fade" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Attachment" className="max-h-[90vh] max-w-[92vw] rounded-xl object-contain shadow-pop" onClick={(e) => e.stopPropagation()} />
          <button onClick={() => setLightbox(null)} aria-label="Close"
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25">
            <X size={20} />
          </button>
        </div>,
        document.body
      )}
    </>
  );
}
