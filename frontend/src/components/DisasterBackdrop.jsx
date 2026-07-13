import { useEffect, useMemo, useState } from "react";

// Cinematic ambient backdrop that slowly cycles through B.C.'s common disasters:
// wildfire -> flood -> storm -> earthquake -> air quality. Purely decorative.
const THEMES = ["wildfire", "flood", "storm", "earthquake", "air"];
const WASH = {
  wildfire: "radial-gradient(120% 100% at 50% 100%, rgba(255,96,42,.55), rgba(120,24,10,.15) 58%, transparent)",
  flood: "radial-gradient(120% 100% at 50% 0%, rgba(42,120,220,.5), rgba(10,40,90,.15) 60%, transparent)",
  storm: "linear-gradient(180deg, rgba(96,116,156,.42), rgba(20,30,55,.2))",
  earthquake: "radial-gradient(120% 100% at 50% 68%, rgba(206,132,60,.45), rgba(80,50,20,.15) 60%, transparent)",
  air: "linear-gradient(180deg, rgba(158,150,120,.4), rgba(90,90,70,.2))",
};
const LABEL = { wildfire: "Wildfire", flood: "Flood", storm: "Severe storm", earthquake: "Earthquake", air: "Air quality" };

const rnd = (a, b) => a + Math.random() * (b - a);

export default function DisasterBackdrop({ showLabel = false }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % THEMES.length), 7000);
    return () => clearInterval(t);
  }, []);
  const theme = THEMES[i];

  // stable randomized particles (generated once)
  const embers = useMemo(() => Array.from({ length: 26 }, () => ({
    left: rnd(0, 100), size: rnd(2, 6), dur: rnd(6, 13), delay: rnd(0, 8), drift: rnd(-34, 34),
  })), []);
  const rain = useMemo(() => Array.from({ length: 44 }, () => ({
    left: rnd(0, 100), h: rnd(38, 92), dur: rnd(0.55, 1.15), delay: rnd(0, 2),
  })), []);
  const hazes = useMemo(() => Array.from({ length: 4 }, () => ({
    left: rnd(0, 88), top: rnd(0, 78), size: rnd(180, 400), dur: rnd(8, 16), delay: rnd(0, 4),
  })), []);

  return (
    <div className="disaster-fx" aria-hidden="true">
      <div className="dfx-wash" style={{ background: WASH[theme] }} />

      <div className={theme === "wildfire" ? "g-show" : "g-hide"}>
        {embers.map((e, k) => (
          <span key={k} className="ember" style={{ left: e.left + "%", width: e.size, height: e.size, animationDuration: e.dur + "s", animationDelay: e.delay + "s", "--drift": e.drift + "px" }} />
        ))}
      </div>

      <div className={theme === "flood" || theme === "storm" ? "g-show" : "g-hide"}>
        {rain.map((r, k) => (
          <span key={k} className="rain" style={{ left: r.left + "%", height: r.h, animationDuration: r.dur + "s", animationDelay: r.delay + "s" }} />
        ))}
      </div>

      <div className={theme === "storm" ? "g-show" : "g-hide"}><div className="dfx-lightning" /></div>

      <div className={theme === "air" ? "g-show" : "g-hide"}>
        {hazes.map((h, k) => (
          <span key={k} className="haze" style={{ left: h.left + "%", top: h.top + "%", width: h.size, height: h.size, animationDuration: h.dur + "s", animationDelay: h.delay + "s" }} />
        ))}
      </div>

      <div className={theme === "earthquake" ? "g-show" : "g-hide"}>
        {[0, 1, 2].map((k) => <span key={k} className="seismic" style={{ animationDelay: k + "s" }} />)}
      </div>

      {showLabel && (
        <div className="absolute bottom-6 right-6 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
          <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
          Monitoring · {LABEL[theme]}
        </div>
      )}
    </div>
  );
}
