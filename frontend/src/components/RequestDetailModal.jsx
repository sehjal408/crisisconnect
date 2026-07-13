import { useState } from "react";
import * as Icons from "lucide-react";
import { MapPin, Users, FileText, AlertTriangle, User, UserCheck, Navigation, Paperclip, Camera, Sparkles } from "lucide-react";
import { REQUEST_TYPE, REQUEST_STATUS, ASSIGNMENT_STATUS, PRIORITY, priorityBand, fullDate } from "../lib/meta";
import { Drawer, Badge, StatusTimeline, DetailRow } from "./ui";
import LocationModal from "./LocationModal";

const FLOW = [
  { key: "pending", label: "Submitted", hint: "Waiting for an administrator to review." },
  { key: "reviewed", label: "Reviewed", hint: "An administrator has reviewed this request." },
  { key: "assigned", label: "Volunteer assigned", hint: "A volunteer has been assigned." },
  { key: "in_progress", label: "In progress", hint: "Help is on the way." },
  { key: "resolved", label: "Resolved", hint: "This request has been resolved." },
];

export default function RequestDetailModal({ open, onClose, request, role = "citizen" }) {
  const [showMap, setShowMap] = useState(false);
  if (!request) return null;

  const type = REQUEST_TYPE[request.request_type] || REQUEST_TYPE.other;
  const Icon = Icons[type.icon] || Icons.CircleHelp;
  const st = REQUEST_STATUS[request.status] || { label: request.status, tone: "slate" };
  const band = priorityBand(request.priority_score);
  const pri = band ? PRIORITY[band] : null;
  const isClosed = request.status === "closed";
  const attachments = request.attachments || [];

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        icon={Icon}
        title={`${type.label} request`}
        subtitle={`#${request.id} · ${fullDate(request.created_at)}`}
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
            <StatusTimeline steps={FLOW} current={request.status} />
          )}
        </div>

        {/* details */}
        <div className="mt-4 divide-y divide-line">
          <DetailRow icon={FileText} label="What's needed">{request.description}</DetailRow>
          <DetailRow icon={Users} label="People affected">{request.affected_count || 1}</DetailRow>
          {role !== "citizen" && request.priority_score != null && (
            <DetailRow icon={Sparkles} label="AI triage (suggested)">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  {pri && <Badge tone={pri.tone} dot>{pri.label}</Badge>}
                  <span className="text-[12px] text-muted">priority {request.priority_score}/100</span>
                </div>
                {request.ai_summary && <span className="text-[13px] text-body">{request.ai_summary}</span>}
              </div>
            </DetailRow>
          )}
          <DetailRow icon={MapPin} label="Location">
            <div className="flex flex-wrap items-center gap-2">
              <span>{request.address || "Not provided"}</span>
              {(request.address || request.latitude != null) && (
                <button onClick={() => setShowMap(true)} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-teal-600 hover:underline">
                  <Navigation size={12} /> View on map
                </button>
              )}
            </div>
          </DetailRow>
          {request.incident_title && <DetailRow icon={AlertTriangle} label="Related incident">{request.incident_title}</DetailRow>}
          {role !== "citizen" && request.citizen_name && <DetailRow icon={User} label="Requested by">{request.citizen_name}</DetailRow>}
          {request.assignment && (
            <DetailRow icon={UserCheck} label="Assignment">
              <Badge tone={(ASSIGNMENT_STATUS[request.assignment.status] || {}).tone || "slate"}>
                {(ASSIGNMENT_STATUS[request.assignment.status] || {}).label || request.assignment.status}
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
              {attachments.map((a, i) => (
                <img key={i} src={a.url || a} alt="" className="h-24 w-full rounded-xl object-cover hairline" />
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl bg-line-soft/60 px-3 py-3 text-[12.5px] text-muted">
              <Camera size={15} /> No photos attached — photo upload arrives in Week 11.
            </div>
          )}
        </div>
      </Drawer>

      <LocationModal
        open={showMap}
        onClose={() => setShowMap(false)}
        title="Request location"
        address={request.address}
        latitude={request.latitude}
        longitude={request.longitude}
      />
    </>
  );
}
