import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TriangleAlert, ListChecks, Users, BedDouble, ArrowRight, ChevronRight } from "lucide-react";
import { dashboard, requests as requestsApi, incidents as incidentsApi, shelters as sheltersApi } from "../../api/services";
import { REQUEST_TYPE, REQUEST_STATUS, timeAgo } from "../../lib/meta";
import AppShell from "../../components/AppShell";
import CrisisMap from "../../components/CrisisMap";
import RoadmapNote from "../../components/RoadmapNote";
import RequestDetailModal from "../../components/RequestDetailModal";
import { Card, Badge, PageHeader, Spinner, CountUp, AlertBanner } from "../../components/ui";

const STATS = [
  { key: "active_incidents", label: "Active incidents", icon: TriangleAlert, tint: "#e0574b", to: "/admin/incidents" },
  { key: "open_requests", label: "Open requests", icon: ListChecks, tint: "#1f3a5c", to: "/admin/requests" },
  { key: "available_volunteers", label: "Volunteers ready", icon: Users, tint: "#16a394", to: "/admin/requests" },
  { key: "shelter_available_beds", label: "Shelter beds free", icon: BedDouble, tint: "#ef9b3e", to: "/admin/shelters" },
];

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState(null);
  const [queue, setQueue] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);

  useEffect(() => {
    Promise.all([
      dashboard.summary().then(setSummary),
      requestsApi.all().then(setQueue),
      incidentsApi.list().then(setIncidents),
      sheltersApi.list().then(setShelters),
    ]).finally(() => setLoading(false));
  }, []);

  const attention = queue.filter((r) => !["resolved", "closed"].includes(r.status)).slice(0, 5);
  const criticalCount = incidents.filter((i) => i.severity === "critical").length;

  if (loading) return <AppShell><Spinner label="Loading overview…" /></AppShell>;

  return (
    <AppShell>
      <PageHeader eyebrow="Operations" title="Overview" subtitle="The live state of the response, at a glance." live="Live" />

      {criticalCount > 0 && <AlertBanner count={criticalCount} />}

      <RoadmapNote
        week="Week 11"
        items={[
          "Analytics charts & response impact metrics",
          "PDF / CSV report export for stakeholders",
        ]}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STATS.map((s) => (
          <Link key={s.key} to={s.to}>
            <Card className="group h-full p-5" hover glow>
              <div className="flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3" style={{ background: `${s.tint}14`, color: s.tint }}>
                  <s.icon size={19} />
                </span>
                <ChevronRight size={16} className="text-muted transition-transform duration-300 group-hover:translate-x-0.5" />
              </div>
              <p className="mt-4 text-[30px] font-bold leading-none text-shimmer"><CountUp value={summary?.[s.key]} /></p>
              <p className="mt-1.5 text-[13px] text-muted">{s.label}</p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-ink">Live incident map</h2>
            <Link to="/admin/incidents" className="inline-flex items-center gap-1 text-[13px] font-medium text-teal-600 hover:underline">
              All incidents <ArrowRight size={14} />
            </Link>
          </div>
          <CrisisMap incidents={incidents} shelters={shelters} height={420} />
        </div>

        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-ink">Open requests</h2>
            <Link to="/admin/requests" className="text-[13px] font-medium text-teal-600 hover:underline">Triage</Link>
          </div>
          <ul className="space-y-2.5">
            {attention.map((r) => {
              const type = REQUEST_TYPE[r.request_type] || REQUEST_TYPE.other;
              const st = REQUEST_STATUS[r.status] || { label: r.status, tone: "slate" };
              return (
                <li key={r.id}>
                  <button onClick={() => setActive(r)} className="block w-full rounded-xl bg-line-soft/60 p-3 text-left transition hover:bg-line-soft">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[13.5px] font-medium text-ink">{type.label}</p>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-[12px] text-muted">{r.citizen_name} · {r.address} · {timeAgo(r.created_at)}</p>
                  </button>
                </li>
              );
            })}
            {attention.length === 0 && <li className="text-[13px] text-muted">Queue is clear 🎉</li>}
          </ul>
        </Card>
      </div>

      <RequestDetailModal open={!!active} onClose={() => setActive(null)} request={active} role="admin" />
    </AppShell>
  );
}
