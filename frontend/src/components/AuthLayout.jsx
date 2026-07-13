import { Logo } from "./ui";
import DisasterBackdrop from "./DisasterBackdrop";

// Immersive, full-screen "emergency operations network" entry screen.
// A cinematic disaster scene fills the viewport; the form floats in a glass card.
export default function AuthLayout({ children }) {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#081018] px-4 py-16">
      {/* cinematic disaster scene */}
      <DisasterBackdrop showLabel />

      {/* readability scrim / vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(115% 85% at 50% 6%, rgba(8,16,24,.05), rgba(6,12,20,.42) 60%, rgba(4,9,16,.78))" }}
      />

      {/* faint ops-center grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg,#fff 1px, transparent 1px)",
          backgroundSize: "46px 46px",
          WebkitMaskImage: "radial-gradient(circle at 50% 38%, #000, transparent 78%)",
          maskImage: "radial-gradient(circle at 50% 38%, #000, transparent 78%)",
        }}
      />

      {/* top bar */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-5">
        <Logo light />
        <span className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70 backdrop-blur sm:inline-flex">
          <span className="relative grid place-items-center" style={{ width: 7, height: 7 }}>
            <span className="absolute rounded-full" style={{ width: 7, height: 7, background: "#34e3a0", animation: "pulse-ring 1.8s ease-out infinite" }} />
            <span className="rounded-full" style={{ width: 7, height: 7, background: "#34e3a0" }} />
          </span>
          B.C. Emergency Network · Online
        </span>
      </div>

      {/* auth card — clean, high-contrast white panel */}
      <div className="relative z-10 w-full max-w-[430px] animate-rise">
        <div className="rounded-[24px] border border-white/70 bg-white/95 p-8 shadow-[0_40px_110px_-25px_rgba(0,0,0,.75)] backdrop-blur-md">
          {children}
        </div>
        <p className="mt-5 text-center text-[12px] text-white/55">Team SkillSpark · CSIS 4495 · Douglas College</p>
      </div>
    </div>
  );
}
