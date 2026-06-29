import { ShieldCheck, MapPin, Users } from "lucide-react";
import { Logo } from "./ui";

const POINTS = [
  { icon: MapPin, title: "One live picture", text: "Every active incident and open shelter on a single map." },
  { icon: Users, title: "Help, coordinated", text: "Requests reach admins, and volunteers are matched fast." },
  { icon: ShieldCheck, title: "Human-reviewed AI", text: "AI triages and suggests — an administrator always decides." },
];

export default function AuthLayout({ children }) {
  return (
    <div className="relative min-h-screen w-full lg:grid lg:grid-cols-[1.05fr_1fr]">
      <div className="app-aurora" aria-hidden="true" />

      {/* Brand panel */}
      <div
        className="relative hidden overflow-hidden p-12 lg:flex lg:flex-col lg:justify-between"
        style={{ background: "linear-gradient(155deg,#1f3a5c 0%,#15314f 45%,#0f877b 130%)" }}
      >
        <div
          className="animate-glow pointer-events-none absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, #ffffff 0, transparent 40%), radial-gradient(circle at 80% 70%, #ffffff 0, transparent 35%)",
          }}
        />
        <Logo light />
        <div className="relative max-w-md">
          <h1 className="text-[34px] font-bold leading-[1.15] text-white">
            Coordinated crisis response for British Columbia.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-white/70">
            CrisisConnect brings scattered emergency information into one place and
            connects the people who need help with the volunteers who can give it.
          </p>
          <div className="mt-9 space-y-5">
            {POINTS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-3.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/12 text-white">
                  <Icon size={19} />
                </span>
                <div>
                  <p className="text-[14px] font-semibold text-white">{title}</p>
                  <p className="text-[13px] text-white/65">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-[12px] text-white/45">Team SkillSpark · CSIS 4495 · Douglas College</p>
      </div>

      {/* Form panel */}
      <div className="flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm animate-rise">{children}</div>
      </div>
    </div>
  );
}
