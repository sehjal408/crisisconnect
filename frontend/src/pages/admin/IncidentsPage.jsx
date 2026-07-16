import { useEffect, useMemo, useState } from "react";
import * as Icons from "lucide-react";
import { BadgeCheck, Clock, RefreshCw } from "lucide-react";
import { incidents as incidentsApi, shelters as sheltersApi } from "../../api/services";
import { SEVERITY, INCIDENT_TYPE, timeAgo, titleCase } from "../../lib/meta";
import AppShell from "../../components/AppShell";
import CrisisMap from "../../components/CrisisMap";
import RoadmapNote from "../../components/RoadmapNote";
import IncidentDetailModal from "../../components/IncidentDetailModal";
import IncidentTypeFilter from "../../components/IncidentTypeFilter";
import SeverityFilter from "../../components/SeverityFilter";
import { Card, Badge, Button, PageHeader, Spinner, SeverityDot } from "../../components/ui";

export default function AdminIncidentsPage() {
  const [rows, setRows] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [types, setTypes] = useState([]);
  const [sev, setSev] = useState("all");
  const [active, setActive] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [feedMsg, setFeedMsg] = useState("");

  useEffect(() => {
    Promise.all([incidentsApi.list().then(setRows), sheltersApi.list().then(setShelters)])
      .finally(() => setLoading(false));
  }, []);

  async function refreshFeeds() {
    setRefreshing(true);
    try {
      const summary = await incidentsApi.ingest();
      const t = summary.reduce((a, s) => ({ n: a.n + s.inserted, u: a.u + s.updated }), { n: 0, u: 0 });
      setFeedMsg(`Updated from live feeds — ${t.n} new, ${t.u} refreshed.`);
      setRows(await incidentsApi.list());
    } catch {
      setFeedMsg("Could not reach the live feeds right now.");
    } finally {
      setRefreshing(false);
    }
  }

  const filtered = useMemo(
    () => rows.filter((r) => (types.length === 0 || types.includes(r.type)) && (sev === "all" || r.severity === sev)),
    [rows, types, sev]
  );

  if (loading) return <AppShell><Spinner label="Loading incidents…" /></AppShell>;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Monitoring"
        title="Incidents"
        subtitle="Live incidents across British Columbia — pulled from official sources."
        actions={<Button icon={RefreshCw} onClick={refreshFeeds} loading={refreshing}>Refresh feeds</Button>}
      />

      <div className="mb-4 flex flex-col gap-1 rounded-2xl border border-teal-100 bg-teal-50/70 px-4 py-3">
        <p className="text-[13px] text-teal-800">
          <span className="font-semibold">Live B.C. feeds:</span> earthquakes (USGS) · wildfires (BC Wildfire) ·
          weather &amp; air quality (Environment Canada) · floods (BC River Forecast) · road events (DriveBC) ·
          evacuations (EmergencyInfoBC). Filtered to British Columbia; new incidents arrive as <em>pending</em> to verify.
        </p>
        {feedMsg && <p className="text-[12.5px] font-medium text-teal-700">{feedMsg}</p>}
      </div>

      <RoadmapNote
        week="Week 10"
        items={[
          "Cross-source de-duplication of overlapping alerts",
          "Admin verification of feed incidents (pending → verified)",
        ]}
      />

      <SeverityFilter value={sev} onChange={setSev} className="mb-2" />
      <IncidentTypeFilter incidents={rows} value={types} onChange={setTypes} className="mb-3" />

      <CrisisMap incidents={filtered} shelters={shelters} height={560} />

      <div className="mb-4 mt-6 flex flex-wrap items-center gap-2">
        <span className="text-[13px] text-muted">{filtered.length} incidents</span>
      </div>

      <div className="space-y-2.5">
        {filtered.map((i) => {
          const t = INCIDENT_TYPE[i.type] || INCIDENT_TYPE.other;
          const Icon = Icons[t.icon] || Icons.CircleAlert;
          const pending = i.status === "pending";
          return (
            <Card key={i.id} className="flex cursor-pointer flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between" hover onClick={() => setActive(i)}>
              <div className="flex items-center gap-3.5">
                <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `${t.color}1a`, color: t.color }}>
                  <Icon size={19} />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[14.5px] font-semibold text-ink">{i.title}</p>
                    <SeverityDot color={SEVERITY[i.severity]?.color} size={8} />
                  </div>
                  <p className="text-[12px] text-muted">{t.label} · {i.source} · {timeAgo(i.updated_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Badge tone={i.severity === "critical" ? "red" : i.severity === "high" ? "amber" : "slate"}>{SEVERITY[i.severity]?.label}</Badge>
                {pending
                  ? <Badge tone="slate"><Clock size={12} /> Pending</Badge>
                  : <Badge tone="green"><BadgeCheck size={12} /> {titleCase(i.status)}</Badge>}
              </div>
            </Card>
          );
        })}
      </div>

      <IncidentDetailModal open={!!active} onClose={() => setActive(null)} incident={active} />
    </AppShell>
  );
}
