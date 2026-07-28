import { useEffect, useMemo, useState } from "react";
import { ListChecks, CheckCircle2, Timer, TimerReset, TriangleAlert, BedDouble, Download, Printer } from "lucide-react";
import { dashboard as dashboardApi } from "../../api/services";
import { INCIDENT_TYPE, SEVERITY, PRIORITY, titleCase } from "../../lib/meta";
import AppShell from "../../components/AppShell";
import { Card, Button, PageHeader, Spinner } from "../../components/ui";
import { BarList, TrendArea } from "../../components/charts";

const ACCENT = "#16a394";            // single hue for magnitude bars + trend
const SEV_ORDER = ["critical", "high", "medium", "low"];
const PRI_ORDER = ["critical", "urgent", "standard", "low"];

// seconds -> "45m" / "2h 15m" / "—"
function dur(s) {
  if (s == null) return "—";
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function downloadCSV(a) {
  const rows = [
    ["CrisisConnect analytics", new Date().toLocaleString("en-CA")],
    [],
    ["Metric", "Value"],
    ["Open requests", a.requests.open],
    ["Total requests", a.requests.total],
    ["Resolved requests", a.requests.resolved],
    ["Resolution rate (%)", a.requests.resolution_rate],
    ["Avg time to assign (s)", a.requests.avg_assign_seconds ?? ""],
    ["Avg time to resolve (s)", a.requests.avg_resolve_seconds ?? ""],
    ["Incidents pending review", a.incidents.pending],
    ["Incidents verified", a.incidents.verified],
    ["Duplicates merged", a.incidents.merged],
    ["Shelter occupancy (%)", a.shelters.occupancy_rate],
    ["Shelter beds free", a.shelters.free],
    ["Volunteers available", `${a.volunteers.available} / ${a.volunteers.total}`],
    [],
    ["Incidents by type", ""],
    ...a.incidents.by_type.map((t) => [titleCase(t.type), t.n]),
    [],
    ["Requests per day (last 14)", ""],
    ...a.trend_requests.map((d) => [d.date, d.value]),
  ];
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? "")}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `crisisconnect-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function Kpi({ icon: Icon, label, value, sub, tint = ACCENT }) {
  return (
    <Card className="p-4">
      <span className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: `${tint}14`, color: tint }}>
        <Icon size={17} />
      </span>
      <p className="mt-3 text-[26px] font-bold leading-none text-ink tabular-nums">{value}</p>
      <p className="mt-1 text-[12.5px] font-medium text-ink">{label}</p>
      {sub && <p className="text-[11.5px] text-muted">{sub}</p>}
    </Card>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <Card className="p-5">
      <h3 className="text-[14.5px] font-semibold text-ink">{title}</h3>
      {subtitle && <p className="mb-4 mt-0.5 text-[12px] text-muted">{subtitle}</p>}
      <div className={subtitle ? "" : "mt-4"}>{children}</div>
    </Card>
  );
}

export default function InsightsPage() {
  const [a, setA] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { dashboardApi.analytics().then(setA).finally(() => setLoading(false)); }, []);

  const byType = useMemo(() => (a?.incidents.by_type || []).map((t) => ({ label: INCIDENT_TYPE[t.type]?.label || titleCase(t.type), value: t.n, color: ACCENT })), [a]);
  const bySource = useMemo(() => (a?.incidents.by_source || []).map((s) => ({ label: s.source, value: s.n, color: ACCENT })), [a]);
  const bySeverity = useMemo(() => {
    const m = Object.fromEntries((a?.incidents.by_severity || []).map((r) => [r.severity, r.n]));
    return SEV_ORDER.map((s) => ({ label: SEVERITY[s].label, value: m[s] || 0, color: SEVERITY[s].color }));
  }, [a]);
  const byPriority = useMemo(() => PRI_ORDER.map((b) => ({ label: PRIORITY[b].label, value: a?.requests.by_priority?.[b] || 0, color: PRIORITY[b].color })), [a]);

  if (loading) return <AppShell><Spinner label="Loading insights…" /></AppShell>;
  if (!a) return <AppShell><PageHeader eyebrow="Analytics" title="Insights" /><Card className="p-8 text-center text-muted">Analytics are unavailable right now.</Card></AppShell>;

  const liveIncidents = a.incidents.by_type.reduce((s, t) => s + t.n, 0);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Analytics"
        title="Insights"
        subtitle="Operational performance across British Columbia — composition, response times, and trend."
        live="Live"
        actions={
          <div className="flex gap-2">
            <Button variant="subtle" icon={Download} onClick={() => downloadCSV(a)}>Export CSV</Button>
            <Button variant="subtle" icon={Printer} onClick={() => window.print()}>Print / PDF</Button>
          </div>
        }
      />

      {/* KPI row — impact metrics */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Kpi icon={ListChecks} label="Open requests" value={a.requests.open} sub={`${a.requests.total} total`} tint="#1f3a5c" />
        <Kpi icon={CheckCircle2} label="Resolution rate" value={`${a.requests.resolution_rate}%`} sub={`${a.requests.resolved} resolved`} tint="#2e9e6b" />
        <Kpi icon={Timer} label="Avg. time to assign" value={dur(a.requests.avg_assign_seconds)} sub="created → assigned" />
        <Kpi icon={TimerReset} label="Avg. time to resolve" value={dur(a.requests.avg_resolve_seconds)} sub="created → resolved" />
        <Kpi icon={TriangleAlert} label="Live incidents" value={liveIncidents} sub={`${a.incidents.verified} verified`} tint="#e0574b" />
        <Kpi icon={BedDouble} label="Shelter occupancy" value={`${a.shelters.occupancy_rate}%`} sub={`${a.shelters.free} beds free`} tint="#ef9b3e" />
      </div>

      {/* Trend */}
      <div className="mt-5">
        <ChartCard title="Requests over the last 14 days" subtitle="New citizen requests received per day">
          <TrendArea data={a.trend_requests} hue={ACCENT} unit="requests" />
        </ChartCard>
      </div>

      {/* Composition */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <ChartCard title="Incidents by type" subtitle="Active incidents on the map">
          <BarList data={byType} />
        </ChartCard>
        <ChartCard title="Requests by AI priority" subtitle="Auto-triaged on submission (human-in-the-loop)">
          <BarList data={byPriority} empty="No requests triaged yet." />
        </ChartCard>
        <ChartCard title="Incidents by severity">
          <BarList data={bySeverity} />
        </ChartCard>
        <ChartCard title="Incidents by source" subtitle="Official B.C. live feeds">
          <BarList data={bySource} />
        </ChartCard>
      </div>

      {/* Operations */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-[12.5px] font-semibold uppercase tracking-wide text-muted">Verification</p>
          <div className="mt-3 space-y-2 text-[13.5px]">
            <div className="flex items-center justify-between"><span className="text-body">Pending review</span><span className="font-semibold text-ink tabular-nums">{a.incidents.pending}</span></div>
            <div className="flex items-center justify-between"><span className="text-body">Verified</span><span className="font-semibold text-ink tabular-nums">{a.incidents.verified}</span></div>
            <div className="flex items-center justify-between"><span className="text-body">Duplicates merged</span><span className="font-semibold text-ink tabular-nums">{a.incidents.merged}</span></div>
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-[12.5px] font-semibold uppercase tracking-wide text-muted">Volunteers</p>
          <p className="mt-3 text-[26px] font-bold leading-none text-ink tabular-nums">{a.volunteers.available}<span className="text-[15px] font-medium text-muted"> / {a.volunteers.total}</span></p>
          <p className="mt-1 text-[12.5px] text-muted">available now</p>
        </Card>
        <Card className="p-5">
          <p className="text-[12.5px] font-semibold uppercase tracking-wide text-muted">Shelter capacity</p>
          <p className="mt-3 text-[26px] font-bold leading-none text-ink tabular-nums">{a.shelters.occ}<span className="text-[15px] font-medium text-muted"> / {a.shelters.cap} beds</span></p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-line-soft">
            <div className="h-full rounded-full" style={{ width: `${a.shelters.occupancy_rate}%`, background: a.shelters.occupancy_rate >= 90 ? "#ef9b3e" : ACCENT }} />
          </div>
          <p className="mt-1.5 text-[12px] text-muted">{a.shelters.open} open · {a.shelters.full} full</p>
        </Card>
      </div>
    </AppShell>
  );
}
