import { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { MapPin, CheckCircle2, Car, ClipboardList, Navigation } from "lucide-react";
import { volunteers as volApi, assignments as assignApi } from "../../api/services";
import { useAuth } from "../../context/AuthContext";
import { REQUEST_TYPE, ASSIGNMENT_STATUS, SKILLS, SEVERITY, timeAgo } from "../../lib/meta";
import AppShell from "../../components/AppShell";
import LocationModal from "../../components/LocationModal";
import RoadmapNote from "../../components/RoadmapNote";
import RequestDetailModal from "../../components/RequestDetailModal";
import { Card, Button, Badge, Toggle, PageHeader, Spinner, EmptyState, cx } from "../../components/ui";

const NEXT = { assigned: "accepted", accepted: "in_progress", in_progress: "completed" };
const NEXT_LABEL = { assigned: "Accept", accepted: "Start", in_progress: "Mark done" };

export default function VolunteerDashboardPage() {
  const { user } = useAuth();
  const [vol, setVol] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locReq, setLocReq] = useState(null);
  const [detailReq, setDetailReq] = useState(null);

  function loadTasks() {
    return volApi.assignments().then(setTasks);
  }
  useEffect(() => {
    Promise.all([volApi.me().then(setVol), loadTasks()]).finally(() => setLoading(false));
  }, []);

  async function setAvailability(available) {
    setSaving(true);
    try {
      const next = await volApi.updateMe({ availability: available ? "available" : "unavailable" });
      setVol((v) => ({ ...v, ...next }));
    } finally {
      setSaving(false);
    }
  }

  async function advance(a) {
    const next = NEXT[a.status];
    if (!next) return;
    await assignApi.update(a.id, next);
    loadTasks();
  }

  const active = tasks.filter((t) => !["completed", "cancelled"].includes(t.status));
  const done = tasks.filter((t) => t.status === "completed");

  if (loading) return <AppShell><Spinner label="Loading dashboard…" /></AppShell>;

  return (
    <AppShell>
      <PageHeader eyebrow={`Hi, ${user?.name?.split(" ")[0]}`} title="Volunteer dashboard" subtitle="Manage your availability and respond to assigned tasks." />

      <RoadmapNote
        week="Weeks 10–11"
        items={[
          "Push / SMS notifications for newly assigned tasks",
          "Skill-based auto-matching suggestions",
        ]}
      />

      {/* Availability + profile */}
      <Card className="mb-6 overflow-hidden">
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-navy-700 text-[15px] font-semibold text-white">
              {(user?.name || "?").split(" ").map((s) => s[0]).slice(0, 2).join("")}
            </span>
            <div>
              <p className="text-[16px] font-semibold text-ink">{user?.name}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {(vol?.skills || []).map((s) => (
                  <Badge key={s} tone="slate">{SKILLS[s] || s}</Badge>
                ))}
                {vol?.vehicle_available && <Badge tone="blue"><Car size={12} /> Has vehicle</Badge>}
                {!vol?.skills?.length && <span className="text-[13px] text-muted">No skills listed yet</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl bg-line-soft/70 px-4 py-3">
            <div>
              <p className="text-[12px] text-muted">Availability</p>
              <p className={cx("text-[14px] font-semibold", vol?.availability === "available" ? "text-good" : "text-muted")}>
                {vol?.availability === "available" ? "Available now" : "Off duty"}
              </p>
            </div>
            <Toggle checked={vol?.availability === "available"} onChange={setAvailability} />
          </div>
        </div>
      </Card>

      {/* Active assignments */}
      <h2 className="mb-3 text-[15px] font-semibold text-ink">Active assignments · {active.length}</h2>
      {active.length === 0 ? (
        <EmptyState icon={ClipboardList} title="You're all caught up" hint="New tasks assigned by an administrator will appear here." />
      ) : (
        <div className="space-y-3">
          {active.map((a) => {
            const req = a.request || {};
            const type = REQUEST_TYPE[req.request_type] || REQUEST_TYPE.other;
            const Icon = Icons[type.icon] || Icons.CircleHelp;
            const st = ASSIGNMENT_STATUS[a.status] || { label: a.status, tone: "slate" };
            return (
              <Card key={a.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between" hover>
                <div className="group flex cursor-pointer items-start gap-3.5" onClick={() => setDetailReq({ ...req, assignment: { status: a.status } })}>
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-600">
                    <Icon size={20} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[15px] font-semibold text-ink">{type.label}</p>
                      {req.affected_count > 1 && <Badge tone="slate">{req.affected_count} people</Badge>}
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-[13px] text-body">{req.description}</p>
                    <p className="mt-1 flex items-center gap-1 text-[12px] text-muted">
                      <MapPin size={12} /> {req.address || "Location pending"} · {timeAgo(a.assigned_at)}
                    </p>
                    {(req.address || req.latitude != null) && (
                      <button type="button" onClick={(e) => { e.stopPropagation(); setLocReq(req); }}
                        className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-semibold text-teal-600 hover:underline">
                        <Navigation size={12} /> View location
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2.5 sm:flex-col sm:items-end">
                  <Badge tone={st.tone} dot>{st.label}</Badge>
                  {NEXT[a.status] && (
                    <Button size="sm" variant={a.status === "in_progress" ? "accent" : "primary"} icon={a.status === "in_progress" ? CheckCircle2 : undefined} onClick={() => advance(a)}>
                      {NEXT_LABEL[a.status]}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {done.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-[15px] font-semibold text-ink">Completed · {done.length}</h2>
          <div className="space-y-2">
            {done.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 hairline">
                <CheckCircle2 size={17} className="text-good" />
                <p className="flex-1 text-[13.5px] text-body">{(REQUEST_TYPE[a.request?.request_type] || {}).label} · {a.request?.address}</p>
                <span className="text-[12px] text-muted">{timeAgo(a.completed_at || a.assigned_at)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <LocationModal
        open={!!locReq}
        onClose={() => setLocReq(null)}
        title="Task location"
        address={locReq?.address}
        latitude={locReq?.latitude}
        longitude={locReq?.longitude}
      />
      <RequestDetailModal open={!!detailReq} onClose={() => setDetailReq(null)} request={detailReq} role="volunteer" />
    </AppShell>
  );
}
