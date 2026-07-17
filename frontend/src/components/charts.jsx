// Lightweight, dependency-free charts for the Insights page.
// Design rules: thin marks, rounded data-ends, a recessive track for scale, and
// a value printed on every row/segment so identity is never colour-alone.

// Horizontal bar list — magnitude across categories.
export function BarList({ data = [], empty = "No data yet." }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (!data.length) return <p className="text-[13px] text-muted">{empty}</p>;
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.label}>
          <div className="mb-1 flex items-center justify-between text-[12.5px]">
            <span className="truncate pr-2 text-body">{d.label}</span>
            <span className="shrink-0 font-semibold text-ink tabular-nums">{d.value}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-line-soft" title={`${d.label}: ${d.value}`}>
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${(d.value / max) * 100}%`, background: d.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// Donut — part-to-whole, with a legend that pairs colour + label + value.
export function Donut({ data = [], size = 172, thickness = 22, empty = "No data yet." }) {
  const shown = data.filter((d) => d.value > 0);
  const total = shown.reduce((s, d) => s + d.value, 0);
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  const gap = shown.length > 1 ? 3 : 0; // 2–3px surface gap between segments

  let offset = 0;
  const segments = shown.map((d) => {
    const len = (d.value / total) * circ;
    const seg = Math.max(len - gap, 0.5);
    const node = (
      <circle
        key={d.label}
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={d.color}
        strokeWidth={thickness}
        strokeDasharray={`${seg} ${circ}`}
        strokeDashoffset={-offset}
      >
        <title>{`${d.label}: ${d.value}`}</title>
      </circle>
    );
    offset += len;
    return node;
  });

  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef1f5" strokeWidth={thickness} />
          {total > 0 && segments}
        </g>
        <text x="50%" y="48%" textAnchor="middle" style={{ fill: "#0b1521", fontSize: 27, fontWeight: 800 }}>{total}</text>
        <text x="50%" y="60%" textAnchor="middle" style={{ fill: "#8a97a3", fontSize: 11 }}>total</text>
      </svg>
      {shown.length ? (
        <ul className="min-w-[120px] flex-1 space-y-1.5 text-[12.5px]">
          {shown.map((d) => (
            <li key={d.label} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
              <span className="truncate text-body">{d.label}</span>
              <span className="ml-auto font-semibold text-ink tabular-nums">{d.value}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-muted">{empty}</p>
      )}
    </div>
  );
}
