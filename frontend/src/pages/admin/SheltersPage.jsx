import { useEffect, useState } from "react";
import { PawPrint, Accessibility, HeartPulse, MapPin, Plus, Minus, DoorOpen, DoorClosed } from "lucide-react";
import { shelters as sheltersApi, requests as requestsApi } from "../../api/services";
import { SHELTER_STATUS } from "../../lib/meta";
import AppShell from "../../components/AppShell";
import RoadmapNote from "../../components/RoadmapNote";
import ShelterDetailModal from "../../components/ShelterDetailModal";
import ShelterFormModal from "../../components/ShelterFormModal";
import { Card, Badge, Button, PageHeader, Spinner } from "../../components/ui";

export default function AdminSheltersPage() {
  const [rows, setRows] = useState([]);
  const [reqs, setReqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formShelter, setFormShelter] = useState(null);
  const [busy, setBusy] = useState(null);

  function reload() {
    return Promise.all([
      sheltersApi.list().then(setRows),
      requestsApi.all().then(setReqs).catch(() => {}),
    ]);
  }
  useEffect(() => { reload().finally(() => setLoading(false)); }, []);

  const totalCap = rows.reduce((a, s) => a + s.capacity, 0);
  const totalFree = rows.reduce((a, s) => a + (s.available_beds ?? 0), 0);

  async function manage(s, patch) {
    setBusy(s.id);
    try { await sheltersApi.update(s.id, patch); await reload(); }
    finally { setBusy(null); }
  }

  if (loading) return <AppShell><Spinner label="Loading shelters…" /></AppShell>;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Capacity"
        title="Shelters"
        subtitle={`${totalFree} of ${totalCap} beds available across ${rows.length} shelters.`}
        actions={<Button icon={Plus} onClick={() => { setFormShelter(null); setFormOpen(true); }}>Add shelter</Button>}
      />

      <RoadmapNote
        week="Week 10"
        items={["Low-capacity and low-supply alerts (with notifications)"]}
      />

      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((s) => {
          const pct = s.capacity ? (s.occupied_beds / s.capacity) * 100 : 0;
          const st = SHELTER_STATUS[s.status] || { label: s.status, tone: "slate" };
          const bar = s.status === "full" ? "#ef9b3e" : s.status === "closed" ? "#94a6b6" : "#16a394";
          return (
            <Card key={s.id} className="p-5" hover>
              <div className="cursor-pointer" onClick={() => setActive(s)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-ink">{s.name}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[12px] text-muted"><MapPin size={12} /> {s.address}</p>
                  </div>
                  <Badge tone={st.tone} dot>{st.label}</Badge>
                </div>

                <div className="mt-4">
                  <p className="text-[28px] font-bold leading-none text-ink">
                    {s.available_beds}<span className="text-[15px] font-medium text-muted"> / {s.capacity} free</span>
                  </p>
                  <p className="mt-1 text-[12px] text-muted">{s.occupied_beds} occupied</p>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-line-soft">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: bar }} />
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {s.pet_friendly && <Badge tone="slate"><PawPrint size={12} /> Pet-friendly</Badge>}
                  {s.accessibility_support && <Badge tone="slate"><Accessibility size={12} /> Accessible</Badge>}
                  {s.medical_support && <Badge tone="slate"><HeartPulse size={12} /> Medical</Badge>}
                </div>
              </div>

              {/* quick management */}
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3" onClick={(e) => e.stopPropagation()}>
                <div className="inline-flex items-center gap-1 rounded-full bg-line-soft/70 p-1">
                  <button disabled={busy === s.id || s.occupied_beds <= 0} onClick={() => manage(s, { occupied_beds: s.occupied_beds - 1 })} className="grid h-7 w-7 place-items-center rounded-full hover:bg-white disabled:opacity-40"><Minus size={15} /></button>
                  <span className="min-w-[54px] text-center text-[12.5px] font-semibold text-ink">{s.occupied_beds} in</span>
                  <button disabled={busy === s.id || s.occupied_beds >= s.capacity} onClick={() => manage(s, { occupied_beds: s.occupied_beds + 1 })} className="grid h-7 w-7 place-items-center rounded-full hover:bg-white disabled:opacity-40"><Plus size={15} /></button>
                </div>
                <Button size="sm" variant="subtle" icon={s.status === "closed" ? DoorOpen : DoorClosed} loading={busy === s.id}
                  onClick={() => manage(s, { status: s.status === "closed" ? "open" : "closed" })}>
                  {s.status === "closed" ? "Reopen" : "Close"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <ShelterDetailModal
        open={!!active}
        onClose={() => setActive(null)}
        shelter={active}
        role="admin"
        requests={reqs}
        onChanged={reload}
        onEdit={(s) => { setActive(null); setFormShelter(s); setFormOpen(true); }}
      />
      <ShelterFormModal
        open={formOpen}
        shelter={formShelter}
        onClose={() => setFormOpen(false)}
        onSaved={() => { setFormOpen(false); reload(); }}
      />
    </AppShell>
  );
}
