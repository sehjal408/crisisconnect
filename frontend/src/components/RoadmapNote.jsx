import { Hammer } from "lucide-react";

// A subtle "under construction" callout that flags what's intentionally not built
// yet (the post-midterm roadmap), so reviewers can see what each page will gain.
export default function RoadmapNote({ items = [], week }) {
  return (
    <div className="mb-5 rounded-2xl border border-dashed p-4" style={{ borderColor: "#e3c98f", background: "#fdf7ec" }}>
      <div className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: "#b07d2b" }}>
        <Hammer size={15} /> Planned next{week ? ` · ${week}` : ""}
      </div>
      <ul className="mt-2 grid gap-1 text-[12.5px] text-body sm:grid-cols-2">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2">
            <span style={{ color: "#d98a3d" }}>•</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
