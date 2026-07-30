import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ShieldCheck, ImagePlus } from "lucide-react";
import { requests, incidents as incidentsApi } from "../api/services";
import { REQUEST_TYPE } from "../lib/meta";
import { Button, Field, TextInput, Textarea, Select } from "./ui";
import AddressAutocomplete from "./AddressAutocomplete";

const EMPTY_FORM = { request_type: "shelter", incident_id: "", affected_count: 1, address: "", latitude: null, longitude: null, description: "" };

export default function RequestModal({ open, onClose, onCreated }) {
  const [incidents, setIncidents] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) incidentsApi.list().then(setIncidents).catch(() => {});
  }, [open]);

  if (!open) return null;
  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function pickFiles(e) {
    const chosen = [...e.target.files].filter((f) => f.type.startsWith("image/")).slice(0, 5);
    setFiles(chosen);
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.address.trim()) {
      setError("Please enter your location so responders can reach you.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const created = await requests.create({
        ...form,
        incident_id: form.incident_id ? Number(form.incident_id) : null,
        affected_count: Number(form.affected_count) || 1,
      });
      if (files.length) {
        try { await requests.addAttachments(created.id, files); } catch { /* request saved even if a photo fails */ }
      }
      onCreated?.(created);
      onClose();
      setForm(EMPTY_FORM);
      setFiles([]);
    } catch (err) {
      setError(err.message || "Could not submit request");
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
            <h3 className="text-[19px] font-bold text-ink">Request assistance</h3>
            <p className="mt-0.5 text-[13px] text-muted">An administrator reviews every request.</p>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-line-soft">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="What do you need?">
              <Select value={form.request_type} onChange={update("request_type")}>
                {Object.entries(REQUEST_TYPE).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="People affected">
              <TextInput type="number" min="1" value={form.affected_count} onChange={update("affected_count")} />
            </Field>
          </div>

          <Field label="Related incident" hint="Optional — links your request to an active event.">
            <Select value={form.incident_id} onChange={update("incident_id")}>
              <option value="">Not sure / none</option>
              {incidents.map((i) => (
                <option key={i.id} value={i.id}>{i.title}</option>
              ))}
            </Select>
          </Field>

          <Field label="Your location *" hint="Required — start typing and pick your address for an accurate map pin.">
            <AddressAutocomplete
              value={form.address}
              onChange={(v) => setForm((f) => ({ ...f, address: v }))}
              onSelect={({ address, latitude, longitude }) => setForm((f) => ({ ...f, address, latitude, longitude }))}
              placeholder="Start typing an address in B.C.…"
            />
          </Field>

          <Field label="Describe the situation">
            <Textarea required value={form.description} onChange={update("description")} placeholder="Tell us what's happening and what you need…" />
          </Field>

          <Field label="Photos" hint="Optional — up to 5 images to help responders assess the situation.">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-line-soft/40 px-3 py-3 text-[13px] font-medium text-muted transition hover:border-teal-300 hover:text-teal-600">
              <ImagePlus size={16} /> {files.length ? `${files.length} photo${files.length > 1 ? "s" : ""} selected` : "Add photos"}
              <input type="file" accept="image/*" multiple className="hidden" onChange={pickFiles} />
            </label>
            {files.length > 0 && (
              <div className="mt-2 grid grid-cols-4 gap-2">
                {files.map((f, i) => (
                  <div key={i} className="relative">
                    <img src={URL.createObjectURL(f)} alt="" className="h-16 w-full rounded-lg object-cover hairline" />
                    <button type="button" onClick={() => setFiles((xs) => xs.filter((_, k) => k !== i))}
                      className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-ink text-white shadow-soft">
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Field>

          <div className="flex items-center gap-2 rounded-xl bg-teal-50 px-3 py-2.5 text-[12px] text-teal-600">
            <ShieldCheck size={15} />
            An administrator reviews your request and assigns a volunteer.
          </div>

          {error && <p className="text-[13px] font-medium text-[#b3392e]">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="subtle" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={submitting}>Submit request</Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
