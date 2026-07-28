// Lightweight, dependency-free charts for the Insights page.
// Design rules: thin marks, rounded data-ends, a recessive track for scale, and
// a value printed on every row/segment so identity is never colour-alone.
import { useEffect, useRef, useState } from "react";

// Trend area — change over time (single series, one hue) with a hover crosshair.
// Measures its own width so marks/labels never distort.
export function TrendArea({ data = [], height = 190, hue = "#16a394", unit = "requests" }) {
  const wrapRef = useRef(null);
  const [w, setW] = useState(680);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((e) => setW(Math.max(240, e[0].contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const H = height, padT = 14, padB = 26, padX = 6;
  const n = data.length;
  const max = Math.max(1, ...data.map((d) => d.value));
  const x = (i) => padX + (n <= 1 ? 0 : (i / (n - 1)) * (w - padX * 2));
  const y = (v) => padT + (1 - v / max) * (H - padT - padB);
  const line = data.map((d, i) => `${x(i)},${y(d.value)}`).join(" ");
  const area = n ? `M ${x(0)},${y(data[0].value)} ${data.map((d, i) => `L ${x(i)},${y(d.value)}`).join(" ")} L ${x(n - 1)},${H - padB} L ${x(0)},${H - padB} Z` : "";
  const grid = [0.5, 1].map((f) => padT + f * (H - padT - padB));
  const short = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("en-CA", { month: "short", day: "numeric" });

  function onMove(e) {
    const r = wrapRef.current.getBoundingClientRect();
    const rx = e.clientX - r.left;
    let i = Math.round(((rx - padX) / (w - padX * 2)) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  }

  return (
    <div ref={wrapRef} className="relative w-full">
      <svg width={w} height={H} onMouseMove={onMove} onMouseLeave={() => setHover(null)} style={{ display: "block" }}>
        <defs>
          <linearGradient id="tf" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={hue} stopOpacity="0.16" />
            <stop offset="100%" stopColor={hue} stopOpacity="0" />
          </linearGradient>
        </defs>
        {grid.map((gy, i) => <line key={i} x1={padX} x2={w - padX} y1={gy} y2={gy} stroke="#eef1f5" strokeWidth="1" />)}
        {area && <path d={area} fill="url(#tf)" />}
        {n > 1 && <polyline points={line} fill="none" stroke={hue} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
        {hover != null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={padT} y2={H - padB} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(data[hover].value)} r="4" fill="#fff" stroke={hue} strokeWidth="2" />
          </g>
        )}
        {n > 0 && [0, Math.floor((n - 1) / 2), n - 1].map((i, k) => (
          <text key={k} x={Math.min(Math.max(x(i), 18), w - 18)} y={H - 8} textAnchor="middle" style={{ fill: "#8a97a3", fontSize: 11 }}>{short(data[i].date)}</text>
        ))}
      </svg>
      {hover != null && (
        <div className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg bg-ink px-2.5 py-1.5 text-[11px] font-medium text-white shadow-pop"
          style={{ left: x(hover), top: -6 }}>
          {short(data[hover].date)} · <span className="font-bold">{data[hover].value}</span> {unit}
        </div>
      )}
    </div>
  );
}

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
