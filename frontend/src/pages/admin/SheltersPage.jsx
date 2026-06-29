import { useEffect, useState } from "react";
import { PawPrint, Accessibility, HeartPulse, MapPin } from "lucide-react";
import { shelters as sheltersApi } from "../../api/services";
import { SHELTER_STATUS } from "../../lib/meta";
import AppShell from "../../components/AppShell";
import RoadmapNote from "../../components/RoadmapNote";
import ShelterDetailModal from "../../components/ShelterDetailModal";
import { Card, Badge, PageHeader, Spinner } from "../../components/ui";

export default function AdminSheltersPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);

  useEffect(() => { sheltersApi.list().then(setRows).finally(() => setLoading(false)); }, []);

  const totalCap = rows.reduce((a, s) => a + s.capacity, 0);
  const totalFree = rows.reduce((a, s) => a + (s.available_beds ?? 0), 0);

  if (loading) return <AppShell><Spinner label="Loading shelters…" /></AppShell>;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Capacity"
        title="Shelters"
        subtitle={`${totalFree} of ${totalCap} beds available across ${rows.length} shelters.`}
      />

      <RoadmapNote
        week="Week 10"
        items={[
          "Occupancy management — place citizens & update beds",
          "Low-capacity and low-supply alerts",
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((s) => {
          const pct = s.capacity ? (s.occupied_beds / s.capacity) * 100 : 0;
          const st = SHELTER_STATUS[s.status] || { label: s.status, tone: "slate" };
          const bar = s.status === "full" ? "#ef9b3e" : s.status === "closed" ? "#94a6b6" : "#16a394";
          return (
            <Card key={s.id} className="cursor-pointer p-5" hover onClick={() => setActive(s)}>
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
            </Card>
          );
        })}
      </div>

      <ShelterDetailModal open={!!active} onClose={() => setActive(null)} shelter={active} />
    </AppShell>
  );
}
