import { useEffect, useMemo, useState } from "react";
import { Users, Check, X, Car, Mail, Phone, Award, Undo2, ShieldCheck } from "lucide-react";
import { volunteers as volApi } from "../../api/services";
import { SKILLS, CERTIFICATIONS, VERIFICATION_STATUS, timeAgo } from "../../lib/meta";
import AppShell from "../../components/AppShell";
import { Card, Button, Badge, PageHeader, Spinner, EmptyState, cx } from "../../components/ui";

const FILTERS = [
  { key: "pending", label: "Pending review" },
  { key: "verified", label: "Verified" },
  { key: "rejected", label: "Not approved" },
  { key: "all", label: "All" },
];

export default function AdminVolunteersPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [busy, setBusy] = useState(null);

  function load() {
    return volApi.manage().then(setRows);
  }
  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const counts = useMemo(() => ({
    pending: rows.filter((r) => r.verification_status === "pending").length,
    verified: rows.filter((r) => r.verification_status === "verified").length,
    rejected: rows.filter((r) => r.verification_status === "rejected").length,
    all: rows.length,
  }), [rows]);

  const filtered = filter === "all" ? rows : rows.filter((r) => r.verification_status === filter);

  async function setStatus(v, status) {
    setBusy(v.id);
    try { await volApi.setVerification(v.id, status); await load(); }
    finally { setBusy(null); }
  }

  return (
    <AppShell>
      <PageHeader eyebrow="Team" title="Volunteers" subtitle="Review and verify volunteers before they can be assigned to tasks." />

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={cx("rounded-full px-3.5 py-1.5 text-[13px] font-medium transition", filter === f.key ? "bg-ink text-white shadow-soft" : "bg-white text-body hairline hover:bg-line-soft")}>
            {f.label} <span className={cx("ml-1", filter === f.key ? "text-white/70" : "text-muted")}>{counts[f.key]}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner label="Loading volunteers…" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="Nothing here" hint="No volunteers match this filter right now." />
      ) : (
        <div className="space-y-3">
          {filtered.map((v) => {
            const vs = VERIFICATION_STATUS[v.verification_status] || VERIFICATION_STATUS.pending;
            const initials = (v.name || "?").split(" ").map((s) => s[0]).slice(0, 2).join("");
            return (
              <Card key={v.id} className="p-4 sm:p-5" hover>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 flex-1 gap-3.5">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-navy-700 text-[13px] font-semibold text-white">{initials}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[15px] font-semibold text-ink">{v.name}</p>
                        <Badge tone={vs.tone} dot>{vs.label}</Badge>
                        {v.vehicle_available && <Badge tone="blue"><Car size={12} /> Vehicle</Badge>}
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
                        {v.email && <span className="inline-flex items-center gap-1"><Mail size={12} /> {v.email}</span>}
                        {v.phone && <span className="inline-flex items-center gap-1"><Phone size={12} /> {v.phone}</span>}
                        {v.created_at && <span>joined {timeAgo(v.created_at)}</span>}
                      </div>

                      {!!(v.skills || []).length && (
                        <div className="mt-2.5">
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">Skills</p>
                          <div className="flex flex-wrap gap-1.5">
                            {v.skills.map((s) => <Badge key={s} tone="slate">{SKILLS[s] || s}</Badge>)}
                          </div>
                        </div>
                      )}

                      <div className="mt-2.5">
                        <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted"><Award size={12} /> Certifications</p>
                        {(v.certifications || []).length ? (
                          <div className="flex flex-wrap gap-1.5">
                            {v.certifications.map((c) => <Badge key={c} tone="teal">{CERTIFICATIONS[c] || c}</Badge>)}
                          </div>
                        ) : (
                          <span className="text-[12.5px] text-muted">None declared</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* actions */}
                  <div className="flex shrink-0 flex-wrap gap-2 lg:w-48 lg:flex-col">
                    {v.verification_status !== "verified" && (
                      <Button size="sm" variant="accent" icon={Check} className="flex-1" loading={busy === v.id} onClick={() => setStatus(v, "verified")}>Verify</Button>
                    )}
                    {v.verification_status === "pending" && (
                      <Button size="sm" variant="subtle" icon={X} className="flex-1" loading={busy === v.id} onClick={() => setStatus(v, "rejected")}>Reject</Button>
                    )}
                    {v.verification_status === "verified" && (
                      <Button size="sm" variant="ghost" icon={Undo2} className="flex-1" loading={busy === v.id} onClick={() => setStatus(v, "pending")}>Un-verify</Button>
                    )}
                    {v.verification_status === "rejected" && (
                      <Button size="sm" variant="ghost" icon={Undo2} className="flex-1" loading={busy === v.id} onClick={() => setStatus(v, "pending")}>Reconsider</Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
