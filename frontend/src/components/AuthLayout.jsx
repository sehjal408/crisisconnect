import { useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Logo, cx } from "./ui";
import InteractiveBackdrop from "./InteractiveBackdrop";
import { network } from "../api/services";

// Centred frosted-glass auth card floating over a living, mouse-reactive
// backdrop. Communicates trust / reliability / security / calmness while feeling
// alive. The card gets a very subtle 3D tilt toward the cursor (senior-dev
// polish); the entrance animation lives on an outer wrapper so it never fights
// the tilt transform. `leaving` plays a gentle exit before navigation.
export default function AuthLayout({ children, leaving = false }) {
  const [pulse, setPulse] = useState(null);
  const tiltRef = useRef(null);

  useEffect(() => {
    let on = true;
    network.pulse().then((p) => on && setPulse(p)).catch(() => {});
    return () => { on = false; };
  }, []);

  useEffect(() => {
    const el = tiltRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onMove = (e) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      el.style.transform = `rotateX(${(-ny * 4).toFixed(2)}deg) rotateY(${(nx * 4).toFixed(2)}deg)`;
      // drive the cursor spotlight across the glass (card-relative %)
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", (((e.clientX - r.left) / r.width) * 100).toFixed(1) + "%");
      el.style.setProperty("--my", (((e.clientY - r.top) / r.height) * 100).toFixed(1) + "%");
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050c14] px-4 py-16" style={{ perspective: "1200px" }}>
      <InteractiveBackdrop />

      {/* top bar: brand + live status */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-5">
        <div className="animate-logo-in"><Logo light /></div>
        <span
          className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70 backdrop-blur sm:inline-flex animate-logo-in"
          style={{ animationDelay: "0.15s" }}
        >
          <span className="relative grid place-items-center" style={{ width: 7, height: 7 }}>
            <span className="absolute rounded-full" style={{ width: 7, height: 7, background: "#34e3a0", animation: "pulse-ring 2.4s ease-out infinite" }} />
            <span className="rounded-full" style={{ width: 7, height: 7, background: "#34e3a0" }} />
          </span>
          {pulse
            ? `B.C. Network · ${pulse.counts.incidents} monitored${pulse.counts.critical > 0 ? ` · ${pulse.counts.critical} critical` : ""}`
            : "B.C. Emergency Network · Online"}
        </span>
      </div>

      {/* entrance wrapper (outer) keeps its animation off the tilt transform */}
      <div className={cx("relative z-10 w-full max-w-[400px]", leaving ? "animate-card-out" : "animate-rise")}>
        <div ref={tiltRef} style={{ transformStyle: "preserve-3d", transition: "transform .25s cubic-bezier(.22,1,.36,1)" }}>
          {/* the glass window */}
          <div className="relative overflow-hidden rounded-[26px] border border-white/60 bg-white/85 p-7 shadow-[0_44px_120px_-30px_rgba(0,0,0,.85)] backdrop-blur-2xl sm:p-8">
            {/* cursor spotlight — the glass lights up under the pointer */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: "radial-gradient(240px circle at var(--mx,50%) var(--my,0%), rgba(22,163,148,.13), transparent 68%)" }}
            />
            {/* top-edge reflection */}
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(52,227,160,.55), transparent)" }} />
            <div className="relative">{children}</div>
          </div>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-[12px] text-white/60">
            <ShieldCheck size={13} className="text-[#34e3a0]" /> Encrypted session · Team SkillSpark · CSIS 4495
          </p>
        </div>
      </div>
    </div>
  );
}
