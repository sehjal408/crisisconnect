import { useEffect, useMemo, useState } from "react";
import * as Icons from "lucide-react";
import { UserCheck, Check, Navigation, ChevronRight, Sparkles, MapPin, House } from "lucide-react";
import { requests as requestsApi, volunteers as volApi } from "../../api/services";
import { REQUEST_TYPE, REQUEST_STATUS, PRIORITY, priorityBand, timeAgo } from "../../lib/meta";
import AppShell from "../../components/AppShell";
import LocationModal from "../../components/LocationModal";
import RoadmapNote from "../../components/RoadmapNote";
import RequestDetailModal from "../../components/RequestDetailModal";
import PromoteIncidentModal from "../../components/PromoteIncidentModal";
import PlaceShelterModal from "../../components/PlaceShelterModal";
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
    await requestsApi.assign(r.id, Number(volunteerId));
    await load();
    setBusy(null);
  }
  async function setStatus(r, status) {
    setBusy(r.id);
    await requestsApi.setStatus(r.id, status);
    await load();
    setBusy(null);
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
            const assignedVol = r.assignment ? vols.find((v) => v.id === r.assignment.volunteer_id) : null;
            return (
              <Card key={r.id} className="p-5" hover>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  {/* left: details (click to open) */}
                  <div className="group flex cursor-pointer gap-4" onClick={() => setActive(r)}>
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-600"><Icon size={20} /></span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[15px] font-semibold text-ink group-hover:text-teal-600">{type.label}</p>
                        {pri && <Badge tone={pri.tone} dot>{pri.label} · {r.priority_score}</Badge>}
                        <Badge tone={st.tone} dot>{st.label}</Badge>
                        {r.incident_title && <span className="text-[12px] text-muted">· {r.incident_title}</span>}
                        {r.affected_count > 1 && <span className="text-[12px] text-muted">· {r.affected_count} people</span>}
                      </div>
                      <p className="mt-1 line-clamp-1 text-[13.5px] text-body">{r.description}</p>
                      {r.ai_summary && (
                        <p className="mt-1 flex items-start gap-1.5 text-[12.5px] text-muted">
                          <Sparkles size={12} className="mt-[3px] shrink-0 text-teal-500" />
                          <span className="line-clamp-1"><span className="font-semibold text-teal-600">AI</span> · {r.ai_summary}</span>
                        </p>
                      )}
                      <p className="mt-1 text-[12px] text-muted">
                        {r.citizen_name} · {r.address || "—"} · {timeAgo(r.created_at)}
                        {(r.address || r.latitude != null) && (
                          <button type="button" onClick={(e) => { e.stopPropagation(); setLocReq(r); }}
                            className="ml-2 inline-flex items-center gap-1 font-semibold text-teal-600 hover:underline">
                            <Navigation size={12} /> Map
                          </button>
                        )}
                        <span className="ml-2 inline-flex items-center gap-0.5 font-semibold text-teal-600">
                          Details <ChevronRight size={12} />
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* right: actions */}
                  <div className="flex shrink-0 flex-col gap-2 lg:w-56">
                    {assignedVol ? (
                      <div className="flex items-center gap-2 rounded-xl bg-teal-50 px-3 py-2 text-[13px] text-teal-600">
                        <UserCheck size={15} /> Assigned to {assignedVol.name}
                      </div>
                    ) : (
                      <Select disabled={busy === r.id} defaultValue="" onChange={(e) => assign(r, e.target.value)}>
                        <option value="" disabled>Assign volunteer…</option>
                        {vols.map((v) => (
                          <option key={v.id} value={v.id}>{v.name}{v.availability !== "available" ? " (busy)" : ""}</option>
                        ))}
                      </Select>
                    )}
                    {!r.incident_id && (
                      <Button size="sm" variant="subtle" icon={MapPin} onClick={() => setPromoteReq(r)}>Create incident</Button>
                    )}
                    {r.request_type === "shelter" && !["resolved", "closed"].includes(r.status) && (
                      <Button size="sm" variant="subtle" icon={House} onClick={() => setPlaceReq(r)}>Place in shelter</Button>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {r.status === "pending" && (
                        <Button size="sm" variant="subtle" className="flex-1" onClick={() => setStatus(r, "reviewed")} loading={busy === r.id}>Mark reviewed</Button>
                      )}
                      {!["resolved", "closed"].includes(r.status) && (
                        <Button size="sm" variant="accent" className="flex-1" onClick={() => setStatus(r, "resolved")} loading={busy === r.id}>Resolve</Button>
                      )}
                      {!["resolved", "closed"].includes(r.status) && (
                        <Button size="sm" variant="ghost" onClick={() => setStatus(r, "closed")} loading={busy === r.id}>Close</Button>
                      )}
                    </div>
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
