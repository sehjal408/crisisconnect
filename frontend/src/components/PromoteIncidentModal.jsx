import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, MapPin } from "lucide-react";
import { requests as requestsApi } from "../api/services";
import { INCIDENT_TYPE, SEVERITY, priorityBand } from "../lib/meta";
import { Button, Field, TextInput, Select } from "./ui";
import AddressAutocomplete from "./AddressAutocomplete";

// Priority band (Week 9 AI) -> incident severity.
const BAND_TO_SEV = { critical: "critical", urgent: "high", standard: "medium", low: "low" };

// Admin: turn a "Not sure / none" citizen request into a verified map incident.
// Location defaults to the request's coordinates; the admin can adjust type,
// severity, and title before creating. On success the request is linked to it.
export default function PromoteIncidentModal({ open, request, onClose, onCreated }) {
  const [form, setForm] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && request) {
      setForm({
        title: request.address ? `Citizen report — ${request.address}` : "Citizen report",
        type: "other",
        severity: BAND_TO_SEV[priorityBand(request.priority_score)] || "medium",
        address: request.address || "",
        latitude: request.latitude ?? null,
        longitude: request.longitude ?? null,
      });
      setError("");
    }
  }, [open, request]);

  if (!open || !form) return null;
  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (form.latitude == null || form.longitude == null) {
      setError("Pick a map location for this incident.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const incident = await requestsApi.createIncident(request.id, {
        title: form.title,
        type: form.type,
        severity: form.severity,
        latitude: form.latitude,
        longitude: form.longitude,
      });
      onCreated?.(incident);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error?.message || err.message || "Could not create incident");
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm animate-fade" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto animate-rise rounded-[22px] bg-white p-6 shadow-pop">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h3 className="text-[19px] font-bold text-ink">Create incident from request</h3>
            <p className="mt-0.5 text-[13px] text-muted">Turns this citizen report into a verified map incident and links them.</p>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-line-soft">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3.5">
          <Field label="Incident title">
            <TextInput value={form.title} onChange={update("title")} required />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <Select value={form.type} onChange={update("type")}>
                {Object.entries(INCIDENT_TYPE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </Select>
            </Field>
            <Field label="Severity">
              <Select value={form.severity} onChange={update("severity")}>
                {Object.entries(SEVERITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </Select>
            </Field>
          </div>

          <Field label="Location" hint="Defaults to the request's location — adjust if needed.">
            <AddressAutocomplete
              value={form.address}
              onChange={(v) => setForm((f) => ({ ...f, address: v }))}
              onSelect={({ address, latitude, longitude }) => setForm((f) => ({ ...f, address, latitude, longitude }))}
              placeholder="Search an address in B.C.…"
            />
          </Field>

          {form.latitude != null && form.longitude != null && (
            <p className="flex items-center gap-1.5 text-[12px] text-muted">
              <MapPin size={13} className="text-teal-500" /> Location set ({Number(form.latitude).toFixed(3)}, {Number(form.longitude).toFixed(3)})
            </p>
          )}

          {error && <p className="text-[13px] font-medium text-[#b3392e]">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="subtle" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={submitting}>Create incident</Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
