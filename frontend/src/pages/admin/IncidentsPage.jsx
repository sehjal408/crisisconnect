import { useEffect, useMemo, useState } from "react";
import * as Icons from "lucide-react";
import { BadgeCheck, Clock } from "lucide-react";
import { incidents as incidentsApi, shelters as sheltersApi } from "../../api/services";
import { SEVERITY, INCIDENT_TYPE, timeAgo, titleCase } from "../../lib/meta";
import AppShell from "../../components/AppShell";
import CrisisMap from "../../components/CrisisMap";
import RoadmapNote from "../../components/RoadmapNote";
import IncidentDetailModal from "../../components/IncidentDetailModal";
import { Card, Badge, Select, PageHeader, Spinner, SeverityDot } from "../../components/ui";

export default function AdminIncidentsPage() {
  const [rows, setRows] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("");
  const [sev, setSev] = useState("");
  const [active, setActive] = useState(null);

  useEffect(() => {
    Promise.all([incidentsApi.list().then(setRows), sheltersApi.list().then(setShelters)])
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => rows.filter((r) => (!type || r.type === type) && (!sev || r.severity === sev)),
    [rows, type, sev]
  );

  if (loading) return <AppShell><Spinner label="Loading incidents…" /></AppShell>;

  return (
    <AppShell>
      <PageHeader eyebrow="Monitoring" title="Incidents" subtitle="All active incidents across British Columbia." />

      <RoadmapNote
        week="Weeks 9–10"
        items={[
          "Admin-created & verified incidents (flagged by source)",
          "Live ingestion from official feeds + de-duplication",
        ]}
      />

      <CrisisMap incidents={filtered} shelters={shelters} height={360} />

      <div className="mb-4 mt-6 flex flex-wrap items-center gap-2">
        <Select value={type} onChange={(e) => setType(e.target.value)} className="w-auto min-w-[150px]">
          <option value="">All types</option>
          {Object.entries(INCIDENT_TYPE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
        <Select value={sev} onChange={(e) => setSev(e.target.value)} className="w-auto min-w-[150px]">
          <option value="">All severities</option>
          {Object.entries(SEVERITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
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
                <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `${SEVERITY[i.severity]?.color}14`, color: SEVERITY[i.severity]?.color }}>
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
