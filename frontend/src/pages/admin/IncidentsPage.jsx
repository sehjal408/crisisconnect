import { useEffect, useMemo, useState } from "react";
import * as Icons from "lucide-react";
import { BadgeCheck, Clock, RefreshCw, GitMerge } from "lucide-react";
import { incidents as incidentsApi, shelters as sheltersApi } from "../../api/services";
import { SEVERITY, INCIDENT_TYPE, timeAgo, titleCase } from "../../lib/meta";
import AppShell from "../../components/AppShell";
import CrisisMap from "../../components/CrisisMap";
import RoadmapNote from "../../components/RoadmapNote";
import IncidentDetailModal from "../../components/IncidentDetailModal";
import IncidentTypeFilter from "../../components/IncidentTypeFilter";
import SeverityFilter from "../../components/SeverityFilter";
import { Card, Badge, Button, PageHeader, Spinner, SeverityDot, cx } from "../../components/ui";

// A labelled row inside the filter panel: small caption on the left, chips on the right.
function FilterRow({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
      <span className="w-[74px] shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export default function AdminIncidentsPage() {
  const [rows, setRows] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [types, setTypes] = useState([]);
  const [sev, setSev] = useState("all");
  const [active, setActive] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [merging, setMerging] = useState(false);
  const [feedMsg, setFeedMsg] = useState("");
  const [statusView, setStatusView] = useState("all"); // all | pending | verified | dismissed | merged
  const [dismissed, setDismissed] = useState([]);
  const [merged, setMerged] = useState([]);
  const [busy, setBusy] = useState(null);

  // Active incidents (rows) exclude dismissed + merged duplicates; those are fetched
  // separately so admins can review — and undo — them from their own filters.
  async function reload() {
    const [active, dism, mrg] = await Promise.all([
      incidentsApi.list(),
      incidentsApi.list({ status: "dismissed" }),
      incidentsApi.list({ merged: 1 }),
    ]);
    setRows(active);
    setDismissed(dism);
    setMerged(mrg);
  }
  useEffect(() => {
    Promise.all([reload(), sheltersApi.list().then(setShelters)]).finally(() => setLoading(false));
  }, []);

  const pendingCount = useMemo(() => rows.filter((r) => r.status === "pending").length, [rows]);
  const verifiedCount = useMemo(() => rows.filter((r) => r.status === "verified").length, [rows]);

  // Verify / dismiss a pending incident, restore a dismissed one, or unmerge a duplicate.
  async function moderate(i, kind) {
    setBusy(i.id);
    setFeedMsg("");
    try {
      if (kind === "dismiss") await incidentsApi.dismiss(i.id);
      else if (kind === "unmerge") await incidentsApi.unmerge(i.id);
      else await incidentsApi.verify(i.id);
      await reload();
    } catch (err) {
      // Never leave the button silently spinning — surface what went wrong.
      setFeedMsg(err.response?.data?.error?.message || "That action didn't go through — please try again.");
    } finally {
      setBusy(null);
    }
  }

  // Collapse overlapping duplicate incidents on demand (no live feed required).
  async function mergeDuplicates() {
    setMerging(true);
    setFeedMsg("");
    try {
      const { merged, released } = await incidentsApi.dedup();
      setFeedMsg(merged ? `Merged ${merged} duplicate incident${merged > 1 ? "s" : ""}.` : "No duplicates found to merge.");
      await reload();
    } catch {
      setFeedMsg("Could not merge duplicates right now.");
    } finally {
      setMerging(false);
    }
  }

  async function refreshFeeds() {
    setRefreshing(true);
    try {
      const summary = await incidentsApi.ingest();
      const t = summary.reduce((a, s) => ({ n: a.n + s.inserted, u: a.u + s.updated }), { n: 0, u: 0 });
      setFeedMsg(`Updated from live feeds — ${t.n} new, ${t.u} refreshed · duplicates merged automatically.`);
      await reload();
    } catch {
      setFeedMsg("Could not reach the live feeds right now.");
    } finally {
      setRefreshing(false);
    }
  }

  const filtered = useMemo(() => {
    const base = statusView === "dismissed" ? dismissed : statusView === "merged" ? merged : rows;
    return base.filter((r) =>
      (types.length === 0 || types.includes(r.type)) &&
      (sev === "all" || r.severity === sev) &&
      (statusView === "all" || statusView === "dismissed" || statusView === "merged" || r.status === statusView));
  }, [rows, dismissed, merged, types, sev, statusView]);

  if (loading) return <AppShell><Spinner label="Loading incidents…" /></AppShell>;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Monitoring"
        title="Incidents"
        subtitle="Live incidents across British Columbia — pulled from official sources."
        actions={
          <>
            <Button variant="subtle" icon={GitMerge} onClick={mergeDuplicates} loading={merging}>Merge duplicates</Button>
            <Button icon={RefreshCw} onClick={refreshFeeds} loading={refreshing}>Refresh feeds</Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-teal-100 bg-teal-50/60 px-3.5 py-2 text-[12.5px]">
        <span className="font-semibold text-teal-800">Live from 7 official B.C. sources</span>
        <span className="text-teal-700/80">USGS · BC Wildfire · Env. Canada · River Forecast · DriveBC · EmergencyInfoBC · AQHI — filtered to B.C.</span>
        {feedMsg && <span className="font-medium text-teal-700">· {feedMsg}</span>}
      </div>

      <RoadmapNote
        week="Week 10"
        items={[
          "Cross-source de-duplication of overlapping alerts",
          "Shelter alerts & citizen notifications",
        ]}
      />

      <div className="mb-5 space-y-2.5 rounded-2xl border border-line bg-white/50 p-4">
        <FilterRow label="Status">
          {[
            { key: "all", label: "All", n: rows.length },
            { key: "pending", label: "Needs verification", n: pendingCount },
            { key: "verified", label: "Verified", n: verifiedCount },
            { key: "dismissed", label: "Dismissed", n: dismissed.length },
            { key: "merged", label: "Merged", n: merged.length },
          ].map((s) => (
            <button key={s.key} onClick={() => setStatusView(s.key)}
              className={cx("inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition",
                statusView === s.key ? "bg-ink text-white shadow-soft" : "bg-white text-body hairline hover:bg-line-soft")}>
              {s.label} <span className={cx(statusView === s.key ? "text-white/70" : "text-muted")}>{s.n}</span>
            </button>
          ))}
        </FilterRow>
        <FilterRow label="Severity">
          <SeverityFilter value={sev} onChange={setSev} />
        </FilterRow>
        <FilterRow label="Type">
          <IncidentTypeFilter incidents={rows} value={types} onChange={setTypes} />
        </FilterRow>
      </div>

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
                  <p className="text-[12px] text-muted">
                    {t.label} · {i.source === "citizen" ? "Citizen report" : i.source} · {timeAgo(i.updated_at)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2.5" onClick={(e) => e.stopPropagation()}>
                <Badge tone={i.severity === "critical" ? "red" : i.severity === "high" ? "amber" : "slate"}>{SEVERITY[i.severity]?.label}</Badge>
                {i.duplicate_of ? (
                  <>
                    <Badge tone="slate"><GitMerge size={12} /> Merged</Badge>
                    <span className="text-[12px] text-muted">→ {i.merged_into_title}</span>
                    <Button size="sm" variant="subtle" loading={busy === i.id} onClick={() => moderate(i, "unmerge")}>Unmerge</Button>
                  </>
                ) : pending ? (
                  <>
                    <Badge tone="slate"><Clock size={12} /> Pending</Badge>
                    <div className="flex gap-2">
                      <Button size="sm" variant="accent" loading={busy === i.id} onClick={() => moderate(i, "verify")}>Verify</Button>
                      <Button size="sm" variant="ghost" loading={busy === i.id} onClick={() => moderate(i, "dismiss")}>Dismiss</Button>
                    </div>
                  </>
                ) : i.status === "dismissed" ? (
                  <>
                    <Badge tone="red">Dismissed</Badge>
                    <Button size="sm" variant="subtle" loading={busy === i.id} onClick={() => moderate(i, "verify")}>Restore</Button>
                  </>
                ) : (
                  <Badge tone="green"><BadgeCheck size={12} /> {titleCase(i.status)}</Badge>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <IncidentDetailModal open={!!active} onClose={() => setActive(null)} incident={active} />
    </AppShell>
  );
}
