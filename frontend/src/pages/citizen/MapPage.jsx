import { useEffect, useMemo, useState } from "react";
import { Plus, MapPin, ChevronRight } from "lucide-react";
import { incidents as incidentsApi, shelters as sheltersApi } from "../../api/services";
import { SEVERITY, INCIDENT_TYPE, timeAgo } from "../../lib/meta";
import AppShell from "../../components/AppShell";
import CrisisMap from "../../components/CrisisMap";
import RequestModal from "../../components/RequestModal";
import RoadmapNote from "../../components/RoadmapNote";
import { Card, Button, Badge, SeverityDot, PageHeader, Spinner, cx } from "../../components/ui";

const SEV_ORDER = ["critical", "high", "medium", "low"];

export default function MapPage() {
  const [incidents, setIncidents] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sev, setSev] = useState("all");
  const [modal, setModal] = useState(false);
  const [focus, setFocus] = useState(null);

  useEffect(() => {
    Promise.all([incidentsApi.list(), sheltersApi.list()])
      .then(([i, s]) => { setIncidents(i); setShelters(s); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => (sev === "all" ? incidents : incidents.filter((i) => i.severity === sev)),
    [incidents, sev]
  );
  const openShelters = shelters.filter((s) => s.status !== "closed");

  return (
    <AppShell>
      <PageHeader
        eyebrow="British Columbia"
        title="Crisis map"
        subtitle="Live incidents and open shelters across British Columbia."
        actions={<Button icon={Plus} onClick={() => setModal(true)}>Request assistance</Button>}
      />

      <RoadmapNote
        week="Weeks 9–10"
        items={[
          "Live incident feeds from 7 official B.C. sources (USGS, BC Wildfire, Environment Canada, DriveBC…)",
          "Automatic de-duplication of incoming alerts",
        ]}
      />

      {/* severity filter */}
      <div className="mb-4 flex flex-wrap gap-2">
        {["all", ...SEV_ORDER].map((s) => (
          <button
            key={s}
            onClick={() => setSev(s)}
            className={cx(
              "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition",
              sev === s ? "bg-ink text-white shadow-soft" : "bg-white text-body hairline hover:bg-line-soft"
            )}
          >
            {s !== "all" && <span className="h-2 w-2 rounded-full" style={{ background: SEVERITY[s].color }} />}
            {s === "all" ? "All severities" : SEVERITY[s].label}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner label="Loading map…" />
      ) : (
        <div className="grid gap-5 lg:h-[calc(100vh_-_13rem)] lg:min-h-[580px] lg:grid-cols-3">
          <div className="flex min-h-0 flex-col lg:col-span-2">
            <CrisisMap incidents={filtered} shelters={shelters} focus={focus} height={null} className="h-[60vh] min-h-[420px] lg:h-auto lg:flex-1" />
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-[12px] text-muted">
              {SEV_ORDER.map((s) => (
                <span key={s} className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: SEVERITY[s].color }} />
                  {SEVERITY[s].label}
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5">
                <span className="grid h-4 w-4 place-items-center rounded-[5px] border-2 border-teal" />
                Shelter
              </span>
            </div>
          </div>

          <div className="space-y-5 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:pr-1">
            <Card className="p-5">
              <h3 className="text-[15px] font-semibold text-ink">Active incidents</h3>
              <p className="mb-3 text-[12px] text-muted">{filtered.length} shown</p>
              <ul className="space-y-1">
                {filtered.map((i) => {
                  const on = focus?.kind === "i" && focus.id === i.id;
                  return (
                    <li key={i.id}>
                      <button
                        onClick={() => setFocus({ kind: "i", id: i.id, latitude: i.latitude, longitude: i.longitude })}
                        className={cx("flex w-full items-start gap-3 rounded-lg px-1.5 py-1.5 text-left transition", on ? "bg-teal-50" : "hover:bg-line-soft")}
                      >
                        <SeverityDot color={SEVERITY[i.severity]?.color} pulse={i.severity === "critical"} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13.5px] font-medium text-ink">{i.title}</p>
                          <p className="text-[12px] text-muted">
                            {INCIDENT_TYPE[i.type]?.label} · {timeAgo(i.updated_at)}
                          </p>
                        </div>
                        <ChevronRight size={15} className={cx("mt-0.5 shrink-0", on ? "text-teal-600" : "text-muted")} />
                      </button>
                    </li>
                  );
                })}
                {filtered.length === 0 && <li className="px-1.5 text-[13px] text-muted">No incidents at this level.</li>}
              </ul>
            </Card>

            <Card className="p-5">
              <h3 className="text-[15px] font-semibold text-ink">Open shelters</h3>
              <p className="mb-3 text-[12px] text-muted">{openShelters.length} accepting people</p>
              <ul className="space-y-1.5">
                {openShelters.map((s) => (
                  <li key={s.id}>
                    <button onClick={() => setFocus({ kind: "s", id: s.id, latitude: s.latitude, longitude: s.longitude })}
                      className={cx("block w-full rounded-lg px-1.5 py-1.5 text-left transition", focus?.kind === "s" && focus.id === s.id ? "bg-teal-50" : "hover:bg-line-soft")}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[13.5px] font-medium text-ink">{s.name}</p>
                        <Badge tone={s.status === "open" ? "green" : "amber"}>{s.available_beds} free</Badge>
                      </div>
                      <p className="mt-0.5 flex items-center gap-1 text-[12px] text-muted">
                        <MapPin size={12} /> {s.address}
                      </p>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line-soft">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${(s.occupied_beds / s.capacity) * 100}%`, background: s.status === "full" ? "#ef9b3e" : "#16a394" }}
                        />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      )}

      <RequestModal open={modal} onClose={() => setModal(false)} />
    </AppShell>
  );
}
