import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, BedDouble, MapPin } from "lucide-react";
import { shelters as sheltersApi, requests as requestsApi } from "../api/services";
import { Button, Spinner } from "./ui";

// Admin: place a citizen request into a shelter (from the request side).
// Lists shelters with their availability; clicking one consumes beds + links.
export default function PlaceShelterModal({ open, request, onClose, onPlaced }) {
  const [list, setList] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setList(null); setError("");
    sheltersApi.list().then(setList).catch(() => setList([]));
  }, [open]);

  if (!open || !request) return null;
  const need = request.affected_count || 1;

  async function place(shelter) {
    setBusy(shelter.id); setError("");
    try {
      const res = await requestsApi.place(request.id, shelter.id);
      onPlaced?.(res);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error?.message || err.message || "Could not place in shelter");
    } finally { setBusy(null); }
  }

  const eligible = (list || []).filter((s) => s.status !== "closed");

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm animate-fade" onClick={onClose} />
      <div className="relative max-h-[85vh] w-full max-w-md overflow-y-auto animate-rise rounded-[22px] bg-white p-6 shadow-pop">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-[19px] font-bold text-ink">Place in a shelter</h3>
            <p className="mt-0.5 text-[13px] text-muted">{need} {need > 1 ? "people" : "person"} · pick a shelter with room.</p>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-line-soft"><X size={18} /></button>
        </div>
        {error && <p className="mb-3 text-[13px] font-medium text-[#b3392e]">{error}</p>}
        {list === null ? (
          <Spinner label="Loading shelters…" />
        ) : (
          <div className="space-y-2">
            {eligible.map((s) => {
              const full = s.available_beds <= 0;
              const room = s.available_beds >= need;
              return (
                <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl hairline p-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-ink">{s.name}</p>
                    <p className="flex items-center gap-1 truncate text-[12px] text-muted"><MapPin size={11} /> {s.address}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[12px] text-muted">
                      <BedDouble size={11} /> {s.available_beds} of {s.capacity} free
                    </p>
                  </div>
                  <Button size="sm" variant={room ? "accent" : "subtle"} loading={busy === s.id} disabled={full} onClick={() => place(s)}>
                    {full ? "Full" : room ? "Place here" : "Place (partial)"}
                  </Button>
                </div>
              );
            })}
            {eligible.length === 0 && <p className="text-[13px] text-muted">No open shelters right now.</p>}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
