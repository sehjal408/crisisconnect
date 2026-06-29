import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

// Canada-Post-style address autocomplete: type a few characters and pick the
// correct address from a live dropdown. Backed by Photon (a free, no-key
// geocoder tuned for type-ahead), biased to British Columbia. Picking a result
// captures the exact latitude/longitude so the request gets an accurate pin.

// BC bounding box for Photon: west,south,east,north
const BC_BBOX = "-139.06,48.30,-114.03,60.00";
const BC_CENTER = { lat: 53.726, lon: -127.6476 };

const PROV = {
  "British Columbia": "BC", Alberta: "AB", Saskatchewan: "SK", Manitoba: "MB",
  Ontario: "ON", Quebec: "QC", "Québec": "QC", "New Brunswick": "NB",
  "Nova Scotia": "NS", "Prince Edward Island": "PE", "Newfoundland and Labrador": "NL",
  Yukon: "YT", "Northwest Territories": "NT", Nunavut: "NU",
};

// Build a clean, single-line label like "1055 Robson St, Vancouver, BC V6E 1A6"
function formatLabel(p) {
  const line1 = [p.housenumber, p.street].filter(Boolean).join(" ") || p.name;
  const prov = PROV[p.state] || p.state;
  return [line1, p.city || p.county || p.district, prov, p.postcode].filter(Boolean).join(", ");
}

export default function AddressAutocomplete({ value, onChange, onSelect, placeholder }) {
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef(null);
  const abortRef = useRef(null);
  const skipRef = useRef(false); // don't refetch right after a selection

  useEffect(() => {
    if (skipRef.current) { skipRef.current = false; return; }
    const q = (value || "").trim();
    if (q.length < 3) { setResults([]); setOpen(false); return; }
    const t = setTimeout(async () => {
      try {
        abortRef.current?.abort();
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        setLoading(true);
        const url =
          `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}` +
          `&limit=8&lang=en&lat=${BC_CENTER.lat}&lon=${BC_CENTER.lon}&bbox=${BC_BBOX}`;
        const res = await fetch(url, { signal: ctrl.signal });
        const data = await res.json();
        const seen = new Set();
        const items = (data.features || [])
          .filter((f) => f.properties?.countrycode === "CA")
          .map((f) => ({
            label: formatLabel(f.properties),
            latitude: f.geometry.coordinates[1],
            longitude: f.geometry.coordinates[0],
          }))
          .filter((it) => it.label && !seen.has(it.label) && seen.add(it.label));
        setResults(items);
        setActive(-1);
        setOpen(true);
      } catch (e) {
        if (e.name !== "AbortError") setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [value]);

  useEffect(() => {
    function onDoc(e) { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function pick(it) {
    skipRef.current = true;
    onChange(it.label);
    onSelect?.({ address: it.label, latitude: it.latitude, longitude: it.longitude });
    setOpen(false);
    setResults([]);
    setActive(-1);
  }

  function onKeyDown(e) {
    if (!open || !results.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); pick(results[active]); }
    else if (e.key === "Escape") { setOpen(false); }
  }

  return (
    <div className="relative" ref={boxRef}>
      <input
        className="h-11 w-full rounded-xl bg-white px-3.5 text-sm text-ink placeholder:text-muted hairline focus-ring transition"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          onSelect?.({ address: e.target.value, latitude: null, longitude: null });
        }}
        onFocus={() => results.length && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && (results.length > 0 || loading) && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl bg-white p-1 shadow-pop hairline">
          {loading && <li className="px-3 py-2 text-[12px] text-muted">Searching addresses…</li>}
          {results.map((it, i) => (
            <li key={it.label}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(it)}
                className={
                  "flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-body " +
                  (i === active ? "bg-line-soft" : "hover:bg-line-soft")
                }
              >
                <MapPin size={14} className="mt-0.5 shrink-0 text-teal-600" />
                <span className="line-clamp-2">{it.label}</span>
              </button>
            </li>
          ))}
          {!loading && results.length === 0 && (
            <li className="px-3 py-2 text-[12px] text-muted">No matches — keep typing.</li>
          )}
        </ul>
      )}
    </div>
  );
}
