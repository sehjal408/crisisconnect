import { useEffect, useMemo, useState } from "react";
import * as Icons from "lucide-react";
import { UserCheck, Check, Navigation, Sparkles, MapPin, House, X, User, Users, AlertTriangle } from "lucide-react";
import { requests as requestsApi, volunteers as volApi } from "../../api/services";
import { REQUEST_TYPE, REQUEST_STATUS, PRIORITY, priorityBand, timeAgo } from "../../lib/meta";
import AppShell from "../../components/AppShell";
import LocationModal from "../../components/LocationModal";
import RoadmapNote from "../../components/RoadmapNote";
import RequestDetailModal from "../../components/RequestDetailModal";
import PromoteIncidentModal from "../../components/PromoteIncidentModal";
import PlaceShelterModal from "../../components/PlaceShelterModal";
import ActionMenu from "../../components/ActionMenu";
import { Card, Button, Badge, Select, PageHeader, Spinner, EmptyState, cx } from "../../components/ui";

const TABS = [
  { key: "open", label: "Open" },
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "assigned", label: "Assigned" },
  { key: "resolved", label: "Resolved" },
];

export default function AdminRequestsPage() {
  const [rows, setRows] = useState([]);
  const [vols, setVols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("open");
  const [busy, setBusy] = useState(null);
  const [locReq, setLocReq] = useState(null);
  const [active, setActive] = useState(null);
  const [promoteReq, setPromoteReq] = useState(null);
  const [placeReq, setPlaceReq] = useState(null);

  function load() {
    return Promise.all([requestsApi.all().then(setRows), volApi.available().then(setVols)]);
  }
  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const filtered = useMemo(() => {
    if (tab === "all") return rows;
    if (tab === "open") return rows.filter((r) => !["resolved", "closed"].includes(r.status));
    return rows.filter((r) => r.status === tab);
  }, [rows, tab]);

  async function assign(r, volunteerId) {
    if (!volunteerId) return;
    setBusy(r.id);
    try { await requestsApi.assign(r.id, Number(volunteerId)); await load(); }
    finally { setBusy(null); }
  }
  async function setStatus(r, status) {
    setBusy(r.id);
    try { await requestsApi.setStatus(r.id, status); await load(); }
    finally { setBusy(null); }
  }

  return (
    <AppShell>
      <PageHeader eyebrow="Triage" title="Request queue" subtitle="AI-ranked by urgency — an administrator makes the final decision." />

      <div className="mb-5 flex items-center gap-2 rounded-xl border border-teal-100 bg-teal-50/60 px-3.5 py-2 text-[12.5px] text-teal-800">
        <Sparkles size={14} className="shrink-0 text-teal-600" />
        <span><span className="font-semibold">AI auto-triage is live</span> — requests are scored and sorted by urgency; you make the final call.</span>
      </div>

      <RoadmapNote
        week="Week 10"
        items={[
          "Reassign volunteers and add internal triage notes",
          "Bulk actions on the queue",
        ]}
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const count = t.key === "all" ? rows.length : t.key === "open" ? rows.filter((r) => !["resolved", "closed"].includes(r.status)).length : rows.filter((r) => r.status === t.key).length;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cx("rounded-full px-3.5 py-1.5 text-[13px] font-medium transition", tab === t.key ? "bg-ink text-white shadow-soft" : "bg-white text-body hairline hover:bg-line-soft")}>
              {t.label} <span className={cx("ml-1", tab === t.key ? "text-white/70" : "text-muted")}>{count}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <Spinner label="Loading queue…" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Check} title="Nothing here" hint="No requests match this filter right now." />
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const type = REQUEST_TYPE[r.request_type] || REQUEST_TYPE.other;
            const Icon = Icons[type.icon] || Icons.CircleHelp;
            const st = REQUEST_STATUS[r.status] || { label: r.status, tone: "slate" };
            const band = priorityBand(r.priority_score);
            const pri = band ? PRIORITY[band] : null;
            const priColor = pri ? pri.color : "#8a97a3";
            const assignedVol = r.assignment ? vols.find((v) => v.id === r.assignment.volunteer_id) : null;
            const needsIncident = !r.incident_id && !["resolved", "closed"].includes(r.status);
            return (
              <Card key={r.id} className={cx("p-4 sm:p-5", needsIncident && "border-l-[3px] border-l-[#ef9b3e]")} hover>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  {/* main content — click to open the detail drawer */}
                  <div className="group flex min-w-0 flex-1 cursor-pointer gap-3.5" onClick={() => setActive(r)}>
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ background: `${priColor}14`, color: priColor }}>
                      <Icon size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-[15px] font-semibold text-ink group-hover:text-teal-600">{type.label}</p>
                        {pri && <Badge tone={pri.tone} dot>{pri.label}</Badge>}
                        <Badge tone={st.tone} dot>{st.label}</Badge>
                        {!r.incident_id && !["resolved", "closed"].includes(r.status) && (
                          <Badge tone="amber" dot>No incident</Badge>
                        )}
                        {r.affected_count > 1 && (
                          <span className="inline-flex items-center gap-1 text-[11.5px] text-muted"><Users size={12} /> {r.affected_count}</span>
                        )}
                      </div>

                      <p className="mt-1.5 line-clamp-2 text-[13.5px] leading-relaxed text-body">{r.description}</p>

                      {r.ai_summary && (
                        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-teal-50/60 px-2.5 py-1.5 text-[12px] text-teal-800">
                          <Sparkles size={12} className="mt-[3px] shrink-0 text-teal-500" />
                          <span className="line-clamp-2"><span className="font-semibold">AI triage</span> · {r.ai_summary}</span>
                        </p>
                      )}

                      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
                        <span className="inline-flex items-center gap-1"><User size={12} /> {r.citizen_name}</span>
                        {r.address && <span className="inline-flex items-center gap-1"><MapPin size={12} /> {r.address}</span>}
                        <span>{timeAgo(r.created_at)}</span>
                        {r.incident_title && (
                          <span className="inline-flex items-center gap-1"><AlertTriangle size={12} /> {r.incident_title}</span>
                        )}
                        {(r.address || r.latitude != null) && (
                          <button type="button" onClick={(e) => { e.stopPropagation(); setLocReq(r); }}
                            className="inline-flex items-center gap-1 font-medium text-teal-600 hover:underline">
                            <Navigation size={12} /> Map
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* right: actions */}
                  <div className="flex shrink-0 flex-col gap-2 lg:w-52">
                    {["resolved", "closed"].includes(r.status) ? (
                      <div className="rounded-xl bg-line-soft/70 px-3 py-2 text-center text-[13px] font-medium text-muted">
                        {(REQUEST_STATUS[r.status] || {}).label || r.status}
                      </div>
                    ) : (
                      <>
                        {assignedVol ? (
                          <div className="flex items-center gap-2 rounded-xl bg-teal-50 px-3 py-2 text-[13px] font-medium text-teal-600">
                            <UserCheck size={15} /> {assignedVol.name}
                          </div>
                        ) : (
                          <Select disabled={busy === r.id} defaultValue="" onChange={(e) => assign(r, e.target.value)}>
                            <option value="" disabled>Assign volunteer…</option>
                            {vols.map((v) => (
                              <option key={v.id} value={v.id}>{v.name}{v.availability !== "available" ? " (busy)" : ""}</option>
                            ))}
                          </Select>
                        )}
                        <div className="flex gap-2">
                          <Button size="sm" variant="accent" className="flex-1" loading={busy === r.id} onClick={() => setStatus(r, "resolved")}>Resolve</Button>
                          <ActionMenu items={[
                            r.status === "pending" && { label: "Mark reviewed", icon: Check, onClick: () => setStatus(r, "reviewed") },
                            !r.incident_id && { label: "Create incident", icon: MapPin, onClick: () => setPromoteReq(r) },
                            r.request_type === "shelter" && { label: "Place in shelter", icon: House, onClick: () => setPlaceReq(r) },
                            { label: "Close request", icon: X, onClick: () => setStatus(r, "closed"), danger: true },
                          ].filter(Boolean)} />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <LocationModal
        open={!!locReq}
        onClose={() => setLocReq(null)}
        title="Request location"
        address={locReq?.address}
        latitude={locReq?.latitude}
        longitude={locReq?.longitude}
      />
      <RequestDetailModal open={!!active} onClose={() => setActive(null)} request={active} role="admin" volunteers={vols} onChanged={load} />
      <PromoteIncidentModal
        open={!!promoteReq}
        request={promoteReq}
        onClose={() => setPromoteReq(null)}
        onCreated={() => { setPromoteReq(null); load(); }}
      />
      <PlaceShelterModal
        open={!!placeReq}
        request={placeReq}
        onClose={() => setPlaceReq(null)}
        onPlaced={() => { setPlaceReq(null); load(); }}
      />
    </AppShell>
  );
}
