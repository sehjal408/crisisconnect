import { Check } from "lucide-react";
import { cx } from "./ui";

// Multi-select pill group. `options` is a { value: label } map; `value` is an
// array of selected keys. Used for volunteer skills and certifications.
export default function ChipSelect({ options, value = [], onChange }) {
  const selected = new Set(value);
  function toggle(key) {
    const next = new Set(selected);
    next.has(key) ? next.delete(key) : next.add(key);
    onChange([...next]);
  }
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(options).map(([key, label]) => {
        const on = selected.has(key);
        return (
          <button
            type="button"
            key={key}
            onClick={() => toggle(key)}
            className={cx(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-all",
              on ? "bg-teal-50 text-teal-600 ring-2 ring-teal" : "bg-white text-body hairline hover:bg-line-soft"
            )}
          >
            {on && <Check size={13} />}
            {label}
          </button>
        );
      })}
    </div>
  );
}
