import * as LucideIcons from "lucide-react";
import { INCIDENT_TYPE } from "../lib/meta";
import { cx } from "./ui";

// Multi-select incident-type filter chips, shared by every map.
//   value    = array of active type keys ([] = show all)
//   onChange = (nextArray) => void
// Helper `filterByTypes` applies the same selection to a list of incidents.

export function filterByTypes(incidents, types) {
  return !types || types.length === 0 ? incidents : incidents.filter((i) => types.includes(i.type));
}

const BASE = "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition";
const IDLE = "bg-white text-body hairline hover:bg-line-soft";

export default function IncidentTypeFilter({ incidents, value = [], onChange, className }) {
  const present = Object.keys(INCIDENT_TYPE).filter((k) => incidents.some((i) => i.type === k));
  if (present.length <= 1) return null;

  const toggle = (k) => onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k]);

  return (
    <div className={cx("flex flex-wrap gap-2", className)}>
      <button
        onClick={() => onChange([])}
        className={cx(BASE, value.length === 0 ? "bg-ink text-white shadow-soft" : IDLE)}
      >
        All types
      </button>
      {present.map((k) => {
        const t = INCIDENT_TYPE[k] || INCIDENT_TYPE.other;
        const TIcon = LucideIcons[t.icon] || LucideIcons.CircleAlert;
        const on = value.includes(k);
        const count = incidents.filter((i) => i.type === k).length;
        return (
          <button
            key={k}
            onClick={() => toggle(k)}
            className={cx(BASE, on ? "text-white shadow-soft" : IDLE)}
            style={on ? { background: t.color } : undefined}
          >
            <TIcon size={13} style={{ color: on ? "#fff" : t.color }} />
            {t.label}
            <span className={cx("text-[11px]", on ? "text-white/75" : "text-muted")}>{count}</span>
          </button>
        );
      })}
    </div>
  );
}
