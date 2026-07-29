import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { cx } from "./ui";

// Compact overflow (⋯) menu for row actions — keeps cards tidy: one primary
// button stays visible, everything secondary folds in here.
export default function ActionMenu({ items = [] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (!items.length) return null;

  return (
    <div ref={ref} className="relative">
      <button type="button" aria-label="More actions" onClick={() => setOpen((o) => !o)}
        className={cx("grid h-9 w-9 place-items-center rounded-xl border transition",
          open ? "border-line bg-line-soft text-ink" : "border-line/70 text-muted hover:bg-line-soft hover:text-ink")}>
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-1.5 w-52 overflow-hidden rounded-xl bg-white py-1 shadow-pop hairline">
          {items.map((it, i) => (
            <button key={i} type="button" onClick={() => { setOpen(false); it.onClick(); }}
              className={cx("flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] transition hover:bg-line-soft",
                it.danger ? "text-[#b3392e]" : "text-body")}>
              {it.icon && <it.icon size={15} className={it.danger ? "" : "text-muted"} />} {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
