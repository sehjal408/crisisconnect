import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, PawPrint, Accessibility, HeartPulse } from "lucide-react";
import { shelters as sheltersApi } from "../api/services";
import { Button, Field, TextInput, Select, cx } from "./ui";
import AddressAutocomplete from "./AddressAutocomplete";

const BLANK = {
  name: "", address: "", latitude: null, longitude: null,
  capacity: 20, occupied_beds: 0, status: "open",
  medical_support: false, pet_friendly: false, accessibility_support: false,
};

const AMENITIES = [
  { k: "medical_support", label: "Medical", icon: HeartPulse },
  { k: "pet_friendly", label: "Pet-friendly", icon: PawPrint },
  { k: "accessibility_support", label: "Accessible", icon: Accessibility },
];

// Admin: create a shelter, or edit an existing one (pass `shelter`).
export default function ShelterFormModal({ open, shelter, onClose, onSaved }) {
  const editing = !!shelter;
  const [form, setForm] = useState(BLANK);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(shelter ? {
      name: shelter.name, address: shelter.address, latitude: shelter.latitude, longitude: shelter.longitude,
      capacity: shelter.capacity, occupied_beds: shelter.occupied_beds, status: shelter.status,
      medical_support: shelter.medical_support, pet_friendly: shelter.pet_friendly, accessibility_support: shelter.accessibility_support,
    } : BLANK);
    setError("");
  }, [open, shelter]);

  if (!open) return null;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    if (!form.name || !form.address || form.latitude == null) { setError("Name and a map address are required."); return; }
    setSubmitting(true); setError("");
    try {
      const payload = { ...form, capacity: Number(form.capacity) || 0, occupied_beds: Number(form.occupied_beds) || 0 };
      const saved = editing ? await sheltersApi.update(shelter.id, payload) : await sheltersApi.create(payload);
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error?.message || err.message || "Could not save shelter");
    } finally { setSubmitting(false); }
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm animate-fade" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto animate-rise rounded-[22px] bg-white p-6 shadow-pop">
        <div className="mb-5 flex items-start justify-between">
          <h3 className="text-[19px] font-bold text-ink">{editing ? "Edit shelter" : "Add shelter"}</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-line-soft"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3.5">
          <Field label="Shelter name"><TextInput value={form.name} onChange={(e) => set("name", e.target.value)} required /></Field>
          <Field label="Address" hint="Pick from suggestions for an accurate map pin.">
            <AddressAutocomplete
              value={form.address}
              onChange={(v) => set("address", v)}
              onSelect={({ address, latitude, longitude }) => setForm((f) => ({ ...f, address, latitude, longitude }))}
              placeholder="Address in B.C.…"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Capacity (beds)"><TextInput type="number" min="0" value={form.capacity} onChange={(e) => set("capacity", e.target.value)} /></Field>
            <Field label="Occupied beds"><TextInput type="number" min="0" value={form.occupied_beds} onChange={(e) => set("occupied_beds", e.target.value)} /></Field>
          </div>
          <Field label="Status">
            <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="open">Open</option>
              <option value="full">Full</option>
              <option value="closed">Closed</option>
            </Select>
          </Field>
          <Field label="Amenities">
            <div className="flex flex-wrap gap-2">
              {AMENITIES.map(({ k, label, icon: Ic }) => (
                <button type="button" key={k} onClick={() => set(k, !form[k])}
                  className={cx("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition",
                    form[k] ? "bg-teal-500 text-white" : "bg-white text-body hairline hover:bg-line-soft")}>
                  <Ic size={14} /> {label}
                </button>
              ))}
            </div>
          </Field>
          {error && <p className="text-[13px] font-medium text-[#b3392e]">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="subtle" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={submitting}>{editing ? "Save changes" : "Add shelter"}</Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
