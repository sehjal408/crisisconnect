import { useEffect, useMemo, useState } from "react";
import { TriangleAlert, Radio, ListChecks, BedDouble } from "lucide-react";
import { incidents as incidentsApi, requests as requestsApi, shelters as sheltersApi } from "../../api/services";
import { INCIDENT_TYPE, SEVERITY, PRIORITY, priorityBand } from "../../lib/meta";
import AppShell from "../../components/AppShell";
import RoadmapNote from "../../components/RoadmapNote";
import { Card, PageHeader, Spinner } from "../../components/ui";
import { BarList, Donut } from "../../components/charts";

const SEV_ORDER = ["critical", "high", "medium", "low"];
const PRI_ORDER = ["critical", "urgent", "standard", "low"];
const SOURCE_HUE = "#2f6db3"; // single hue — these bars encode magnitude, not identity

export default function InsightsPage() {
  const [incidents, setIncidents] = useState([]);
  const [requests, setRequests] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      incidentsApi.list().then(setIncidents),
      requestsApi.all().then(setRequests),
      sheltersApi.list().then(setShelters),
    ]).finally(() => setLoading(false));
  }, []);

  const byType = useMemo(() => {
    const m = {};
    for (const i of incidents) m[i.type] = (m[i.type] || 0) + 1;
    return Object.entries(m)
      .map(([k, v]) => ({ label: INCIDENT_TYPE[k]?.label || k, value: v, color: INCIDENT_TYPE[k]?.color || "#8a97a3" }))
      .sort((a, b) => b.value - a.value);
  }, [incidents]);

  const bySeverity = useMemo(
    () => SEV_ORDER.map((s) => ({ label: SEVERITY[s].label, value: incidents.filter((i) => i.severity === s).length, color: SEVERITY[s].color })),
    [incidents]
  );

  const bySource = useMemo(() => {
    const m = {};
    for (const i of incidents) if (i.source) m[i.source] = (m[i.source] || 0) + 1;
    return Object.entries(m).map(([k, v]) => ({ label: k, value: v, color: SOURCE_HUE })).sort((a, b) => b.value - a.value);
  }, [incidents]);

  const byPriority = useMemo(
    () => PRI_ORDER.map((b) => ({ label: PRIORITY[b].label, value: requests.filter((r) => priorityBand(r.priority_score) === b).length, color: PRIORITY[b].color })),
    [requests]
  );

  if (loading) return <AppShell><Spinner label="Loading insights…" /></AppShell>;

  const bedsFree = shelters.reduce((s, x) => s + (x.available_beds || 0), 0);
  const openReq = requests.filter((r) => !["resolved", "closed"].includes(r.status)).length;
  const feeds = new Set(incidents.map((i) => i.source).filter(Boolean)).size;
  const STATS = [
    { label: "Live incidents", value: incidents.length, icon: TriangleAlert, tint: "#e0574b" },
    { label: "Active feeds", value: feeds, icon: Radio, tint: "#16a394" },
    { label: "Open requests", value: openReq, icon: ListChecks, tint: "#1f3a5c" },
    { label: "Shelter beds free", value: bedsFree, icon: BedDouble, tint: "#ef9b3e" },
  ];

  return (
    <AppShell>
      <PageHeader eyebrow="Analytics" title="Insights" subtitle="Live breakdown of incidents, sources, and triage across British Columbia." live="Live" />

      <RoadmapNote
        week="Week 11"
        items={["Response-time & resolution metrics", "PDF / CSV export of these reports"]}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STATS.map((s) => (
          <Card key={s.label} className="p-5" hover>
            <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `${s.tint}14`, color: s.tint }}>
              <s.icon size={19} />
            </span>
            <p className="mt-4 text-[30px] font-bold leading-none text-ink tabular-nums">{s.value}</p>
            <p className="mt-1.5 text-[13px] text-muted">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-4 text-[15px] font-semibold text-ink">Incidents by type</h3>
          <BarList data={byType} />
        </Card>

        <Card className="p-5">
          <h3 className="mb-4 text-[15px] font-semibold text-ink">Incidents by severity</h3>
          <Donut data={bySeverity} />
        </Card>

        <Card className="p-5">
          <h3 className="text-[15px] font-semibold text-ink">Incidents by source</h3>
          <p className="mb-4 text-[12px] text-muted">Official B.C. live feeds</p>
          <BarList data={bySource} />
        </Card>

        <Card className="p-5">
          <h3 className="text-[15px] font-semibold text-ink">Requests by AI priority</h3>
          <p className="mb-4 text-[12px] text-muted">Auto-triaged on submission (human-in-the-loop)</p>
          <Donut data={byPriority} empty="No requests triaged yet." />
        </Card>
      </div>
    </AppShell>
  );
}
