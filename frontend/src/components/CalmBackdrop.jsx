// Calm "night operations" backdrop for the auth screens.
// Design intent: trust / reliability / security / calmness — so it is STILL by
// design: a deep-navy field, faint topographic contours (B.C. terrain motif),
// and two very slow soft glows. No flashing, no particles, no scene changes.
// All motion is slow-drift only and disabled under prefers-reduced-motion.

const CONTOURS = [
  "M-40,180 C240,120 420,240 720,190 S1200,90 1480,160",
  "M-40,300 C260,240 460,360 760,305 S1220,210 1480,280",
  "M-40,430 C230,370 480,490 760,430 S1240,330 1480,410",
  "M-40,560 C260,500 440,620 740,560 S1210,470 1480,540",
  "M-40,690 C240,640 470,750 760,690 S1230,600 1480,670",
  "M-40,810 C270,760 450,870 750,815 S1220,730 1480,800",
];

export default function CalmBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* deep, settled base — one colour mood, never cycles */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(168deg, #0a1626 0%, #0c1c30 46%, #0a2030 100%)" }}
      />

      {/* two very slow glows (reuse the app's drift keyframes; reduced-motion safe) */}
      <div
        className="absolute rounded-full"
        style={{
          width: "58vmax", height: "58vmax", left: "-16vmax", top: "-22vmax",
          background: "radial-gradient(circle, rgba(22,163,148,.16), transparent 65%)",
          filter: "blur(60px)", animation: "drift-a 36s ease-in-out infinite alternate",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: "52vmax", height: "52vmax", right: "-18vmax", bottom: "-24vmax",
          background: "radial-gradient(circle, rgba(42,77,116,.22), transparent 65%)",
          filter: "blur(60px)", animation: "drift-b 44s ease-in-out infinite alternate",
        }}
      />

      {/* faint topographic contours — static, professional, B.C. terrain motif */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
      >
        {CONTOURS.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="#7cc7bd" strokeWidth="1.1" strokeOpacity={0.055 + (i % 2) * 0.02} />
        ))}
      </svg>

      {/* gentle vignette so the card is the brightest thing on screen */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(110% 80% at 50% 42%, transparent 30%, rgba(5,10,18,.55) 100%)" }}
      />
    </div>
  );
}
