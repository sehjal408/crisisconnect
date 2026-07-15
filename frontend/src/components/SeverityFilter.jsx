import { SEVERITY } from "../lib/meta";
import { cx } from "./ui";

// Single-select severity filter chips, shared by every map.
//   value    = "all" | "critical" | "high" | "medium" | "low"
//   onChange = (nextValue) => void
// Helper `filterBySeverity` applies the same selection to a list.

const ORDER = ["critical", "high", "medium", "low"];
const BASE = "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition";
const IDLE = "bg-white text-body hairline hover:bg-line-soft";

export function filterBySeverity(items, sev) {
  return !sev || sev === "all" ? items : items.filter((i) => i.severity === sev);
}

export default function SeverityFilter({ value = "all", onChange, className }) {
  return (
    <div className={cx("flex flex-wrap gap-2", className)}>
      {["all", ...ORDER].map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={cx(BASE, value === s ? "bg-ink text-white shadow-soft" : IDLE)}
        >
          {s !== "all" && <span className="h-2 w-2 rounded-full" style={{ background: SEVERITY[s].color }} />}
          {s === "all" ? "All severities" : SEVERITY[s].label}
        </button>
      ))}
    </div>
  );
}
