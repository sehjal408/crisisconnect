import { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { Plus, Inbox, ChevronRight } from "lucide-react";
import { requests as requestsApi } from "../../api/services";
import { REQUEST_TYPE, REQUEST_STATUS, timeAgo } from "../../lib/meta";
import AppShell from "../../components/AppShell";
import RequestModal from "../../components/RequestModal";
import RoadmapNote from "../../components/RoadmapNote";
import RequestDetailModal from "../../components/RequestDetailModal";
import { Card, Button, Badge, PageHeader, Spinner, EmptyState } from "../../components/ui";

export default function CitizenRequestsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [active, setActive] = useState(null);

  function load() {
    return requestsApi.mine().then(setRows).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Your activity"
        title="My requests"
        subtitle="Track the assistance you've requested and its status."
        actions={<Button icon={Plus} onClick={() => setModal(true)}>New request</Button>}
      />

      <RoadmapNote
        week="Weeks 9 & 11"
        items={[
          "SMS / email alerts when your request status changes",
          "AI-suggested urgency the moment you submit",
        ]}
      />

      {loading ? (
        <Spinner label="Loading your requests…" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No requests yet"
          hint="When you ask for help, your requests and their progress will show up here."
          action={<Button icon={Plus} onClick={() => setModal(true)}>Request assistance</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map((r) => {
            const type = REQUEST_TYPE[r.request_type] || REQUEST_TYPE.other;
            const Icon = Icons[type.icon] || Icons.CircleHelp;
            const status = REQUEST_STATUS[r.status] || { label: r.status, tone: "slate" };
            return (
              <Card key={r.id} className="cursor-pointer p-5" hover onClick={() => setActive(r)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-teal-600">
                      <Icon size={19} />
                    </span>
                    <div>
                      <p className="text-[15px] font-semibold text-ink">{type.label}</p>
                      <p className="text-[12px] text-muted">{timeAgo(r.created_at)}</p>
                    </div>
                  </div>
                  <Badge tone={status.tone} dot>{status.label}</Badge>
                </div>

                <p className="mt-3.5 line-clamp-2 text-[13.5px] leading-relaxed text-body">{r.description}</p>
                {r.address && <p className="mt-1 line-clamp-1 text-[12px] text-muted">📍 {r.address}</p>}
                <div className="mt-3 flex items-center justify-end text-[12px] font-semibold text-teal-600">
                  View details <ChevronRight size={13} />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <RequestModal open={modal} onClose={() => setModal(false)} onCreated={() => load()} />
      <RequestDetailModal open={!!active} onClose={() => setActive(null)} request={active} role="citizen" />
    </AppShell>
  );
}
