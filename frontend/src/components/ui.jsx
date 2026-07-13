// Reusable UI primitives — the CrisisConnect design system.
import { useEffect, useRef, useState } from "react";
import { Loader2, X, Check, TriangleAlert } from "lucide-react";

const cx = (...c) => c.filter(Boolean).join(" ");

/* ----------------------------------------------------------- Logo */
export function Logo({ size = 30, withWord = true, light = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="grid place-items-center rounded-[10px] text-white shadow-soft"
        style={{
          width: size,
          height: size,
          background: "linear-gradient(150deg,#1f3a5c,#16a394)",
        }}
      >
        <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none">
          <path d="M12 2 4 5v6c0 5 3.4 8.5 8 11 4.6-2.5 8-6 8-11V5l-8-3Z" fill="white" opacity="0.18" />
          <path d="M7 12.5h3l1.5-3.5 2 7 1.5-3.5H17" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {withWord && (
        <span className={cx("text-[17px] font-semibold tracking-tight", light ? "text-white" : "text-ink")}>
          CrisisConnect
        </span>
      )}
    </div>
  );
}

/* ----------------------------------------------------------- Button */
const BTN = {
  primary: "text-white shadow-soft hover:brightness-[1.06] active:brightness-95",
  accent: "bg-teal text-white shadow-soft hover:bg-teal-600 active:brightness-95",
  subtle: "bg-white text-ink hairline hover:bg-line-soft",
  ghost: "text-body hover:bg-line-soft",
  danger: "bg-[#e0574b] text-white shadow-soft hover:brightness-105",
};
export function Button({ variant = "primary", size = "md", icon: Icon, loading, children, className, ...rest }) {
  const sizes = { sm: "h-9 px-3.5 text-[13px]", md: "h-11 px-5 text-sm", lg: "h-12 px-6 text-[15px]" };
  const style = variant === "primary" ? { background: "linear-gradient(160deg,#1f3a5c,#15314f)" } : undefined;
  return (
    <button
      style={style}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 focus-ring active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none",
        sizes[size],
        BTN[variant],
        className
      )}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : Icon ? <Icon size={16} /> : null}
      {children}
    </button>
  );
}

/* ----------------------------------------------------------- Card
   Cards reveal themselves on scroll (IntersectionObserver + transition, so the
   reveal never fights the hover lift). Pass reveal={false} to opt out. */
export function Card({ className, children, hover, glow, reveal = true, ...rest }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(!reveal);
  useEffect(() => {
    if (!reveal || shown) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reveal, shown]);
  return (
    <div
      ref={ref}
      className={cx(
        "rounded-[20px] bg-white hairline shadow-soft transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        hover && (glow ? "card-glow hover:-translate-y-1" : "hover:shadow-pop hover:-translate-y-0.5"),
        !shown && "translate-y-4 opacity-0",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/* ----------------------------------------------------------- Badge */
const TONES = {
  green: "bg-[#e8f7ef] text-[#1f7a4d]",
  amber: "bg-[#fdf1e3] text-[#b06a1f]",
  blue: "bg-[#e9f1fb] text-[#2360a8]",
  slate: "bg-[#eef1f5] text-[#5a6b7b]",
  teal: "bg-teal-50 text-teal-600",
  red: "bg-[#fdecea] text-[#b3392e]",
};
export function Badge({ tone = "slate", children, className, dot }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold", TONES[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: "currentColor" }} />}
      {children}
    </span>
  );
}

/* ----------------------------------------------------------- SeverityDot */
export function SeverityDot({ color, pulse, size = 10 }) {
  return (
    <span className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      {pulse && (
        <span
          className="absolute rounded-full"
          style={{ width: size, height: size, background: color, animation: "pulse-ring 1.8s ease-out infinite" }}
        />
      )}
      <span className="rounded-full" style={{ width: size, height: size, background: color }} />
    </span>
  );
}

/* ----------------------------------------------------------- LivePill (pulsing "live monitoring" indicator) */
export function LivePill({ children = "Live", color = "#16a394", className }) {
  return (
    <span
      className={cx("inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] hairline backdrop-blur", className)}
      style={{ color }}
    >
      <span className="relative grid place-items-center" style={{ width: 8, height: 8 }}>
        <span className="absolute rounded-full" style={{ width: 8, height: 8, background: color, animation: "pulse-ring 1.8s ease-out infinite" }} />
        <span className="rounded-full" style={{ width: 8, height: 8, background: color }} />
      </span>
      {children}
    </span>
  );
}

/* ----------------------------------------------------------- AlertBanner (animated hazard strip) */
export function AlertBanner({ count = 1, className }) {
  return (
    <div className={cx("alert-strip mb-5 flex items-center gap-3 rounded-2xl px-4 py-3 text-white", className)}>
      <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/20">
        <TriangleAlert size={18} />
        <span className="absolute inset-0 rounded-full" style={{ background: "rgba(255,255,255,0.45)", animation: "pulse-ring 1.6s ease-out infinite" }} />
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-extrabold uppercase tracking-[0.1em]">Critical alert</p>
        <p className="text-[12.5px] text-white/90">{count} critical incident{count > 1 ? "s" : ""} active — response is being prioritised.</p>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- CountUp (animated number) */
export function useCountUp(target, { duration = 1100 } = {}) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const n = Number(target);
    if (target == null || Number.isNaN(n)) { setVal(null); return; }
    let raf, start;
    const step = (ts) => {
      start = start || ts;
      const k = Math.min((ts - start) / duration, 1);
      setVal(Math.round((1 - Math.pow(1 - k, 3)) * n));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}
export function CountUp({ value, fallback = "—", className }) {
  const v = useCountUp(value);
  return <span className={className}>{v == null ? fallback : v}</span>;
}

/* ----------------------------------------------------------- Skeleton loader */
export function Skeleton({ className }) {
  return <div className={cx("skeleton rounded-lg", className)} />;
}

/* ----------------------------------------------------------- Field / inputs */
export function Field({ label, hint, children }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-[13px] font-medium text-body">{label}</span>}
      {children}
      {hint && <span className="mt-1 block text-[12px] text-muted">{hint}</span>}
    </label>
  );
}
const INPUT = "w-full rounded-xl bg-white px-3.5 text-sm text-ink placeholder:text-muted hairline focus-ring transition";
export function TextInput({ className, ...rest }) {
  return <input className={cx(INPUT, "h-11", className)} {...rest} />;
}
export function Textarea({ className, ...rest }) {
  return <textarea className={cx(INPUT, "py-2.5 min-h-[96px] resize-none", className)} {...rest} />;
}
export function Select({ className, children, ...rest }) {
  return (
    <select className={cx(INPUT, "h-11 appearance-none pr-9 bg-[length:16px] bg-no-repeat", className)}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238a97a3' stroke-width='2.5' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")", backgroundPosition: "right 12px center" }}
      {...rest}>
      {children}
    </select>
  );
}

/* ----------------------------------------------------------- Toggle (iOS switch) */
export function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-3 focus-ring rounded-full"
    >
      <span
        className="relative h-[26px] w-[44px] rounded-full transition-colors duration-300"
        style={{ background: checked ? "#16a394" : "#d6dde4" }}
      >
        <span
          className="absolute top-[2px] h-[22px] w-[22px] rounded-full bg-white shadow transition-all duration-300"
          style={{ left: checked ? "20px" : "2px" }}
        />
      </span>
      {label && <span className="text-sm text-body">{label}</span>}
    </button>
  );
}

/* ----------------------------------------------------------- Spinner / Empty */
export function Spinner({ label }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-muted">
      <Loader2 className="animate-spin" size={18} />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}
export function EmptyState({ icon: Icon, title, hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-line-soft/60 px-6 py-12 text-center">
      {Icon && (
        <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-white hairline text-muted">
          <Icon size={22} />
        </div>
      )}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {hint && <p className="mt-1 max-w-xs text-[13px] text-muted">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ----------------------------------------------------------- Section heading */
export function PageHeader({ eyebrow, title, subtitle, actions, gradient, live }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-1 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-teal-600">
            {eyebrow}
            {live && <LivePill>{typeof live === "string" ? live : "Live"}</LivePill>}
          </p>
        )}
        <h1 className={cx("text-[26px] font-bold leading-tight", gradient ? "text-shimmer" : "text-ink")}>{title}</h1>
        {subtitle && <p className="mt-1 text-[14px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ----------------------------------------------------------- Modal shell */
export function Modal({ open, onClose, title, subtitle, icon: Icon, headerRight, footer, size = "md", children }) {
  if (!open) return null;
  const max = { md: "max-w-md", lg: "max-w-lg", xl: "max-w-2xl" }[size] || "max-w-md";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm animate-fade" onClick={onClose} />
      <div className={cx("relative flex max-h-[88vh] w-full flex-col animate-rise rounded-[22px] bg-white shadow-pop", max)}>
        <div className="flex items-start justify-between gap-3 border-b border-line px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            {Icon && <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-600"><Icon size={20} /></span>}
            <div className="min-w-0">
              <h3 className="truncate text-[18px] font-bold text-ink">{title}</h3>
              {subtitle && <p className="truncate text-[12.5px] text-muted">{subtitle}</p>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {headerRight}
            <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-line-soft"><X size={18} /></button>
          </div>
        </div>
        <div className="overflow-auto px-6 py-5">{children}</div>
        {footer && <div className="border-t border-line px-6 py-3.5">{footer}</div>}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- Drawer (right slide-over) */
export function Drawer({ open, onClose, title, subtitle, icon: Icon, headerRight, footer, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm animate-fade" onClick={onClose} />
      <div className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-pop animate-slide-in">
        <div className="flex items-start justify-between gap-3 border-b border-line px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            {Icon && <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-600"><Icon size={20} /></span>}
            <div className="min-w-0">
              <h3 className="truncate text-[18px] font-bold text-ink">{title}</h3>
              {subtitle && <p className="truncate text-[12.5px] text-muted">{subtitle}</p>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {headerRight}
            <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-line-soft"><X size={18} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-auto px-6 py-5">{children}</div>
        {footer && <div className="border-t border-line px-6 py-3.5">{footer}</div>}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- StatusTimeline (vertical stepper) */
export function StatusTimeline({ steps, current }) {
  const idx = steps.findIndex((s) => s.key === current);
  return (
    <ol className="relative">
      {steps.map((s, i) => {
        const done = idx >= 0 && i < idx;
        const active = i === idx;
        return (
          <li key={s.key} className="relative flex gap-3 pb-4 last:pb-0">
            {i < steps.length - 1 && (
              <span className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-0.5" style={{ background: i < idx ? "#16a394" : "#e7ebf0" }} />
            )}
            <span className="z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full text-white" style={{ background: done || active ? "#16a394" : "#d6dde4" }}>
              {done ? <Check size={13} /> : <span className="h-2 w-2 rounded-full bg-white" />}
            </span>
            <div className="pt-0.5">
              <p className={cx("text-[13.5px] font-semibold", active ? "text-ink" : done ? "text-body" : "text-muted")}>{s.label}</p>
              {active && s.hint && <p className="text-[12px] text-muted">{s.hint}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ----------------------------------------------------------- DetailRow */
export function DetailRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      {Icon && <Icon size={16} className="mt-0.5 shrink-0 text-muted" />}
      <div className="min-w-0 flex-1">
        <p className="text-[11.5px] font-semibold uppercase tracking-wide text-muted">{label}</p>
        <div className="mt-0.5 text-[13.5px] leading-relaxed text-ink">{children}</div>
      </div>
    </div>
  );
}

export { cx };
