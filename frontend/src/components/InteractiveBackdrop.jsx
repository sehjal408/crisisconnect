import { useEffect, useRef } from "react";

// Living, mouse-reactive backdrop for the auth screen.
// - a constellation particle field (the "emergency network" motif) whose links
//   reach toward the cursor as you move the mouse,
// - three soft depth glows that parallax with the pointer,
// - a masked grid + vignette so the centred glass card stays the focal point.
// Pure Canvas 2D + CSS transforms — no WebGL. Respects prefers-reduced-motion.
export default function InteractiveBackdrop() {
  const canvasRef = useRef(null);
  const glowRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0, h = 0, raf = 0;
    const mouse = { x: -9999, y: -9999 };
    const P = [];

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    const count = Math.max(28, Math.min(80, Math.floor((w * h) / 15000)));
    for (let i = 0; i < count; i++) {
      P.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.26, vy: (Math.random() - 0.5) * 0.26 });
    }
    // a few nodes pulse in severity colours — the network feels "live"
    const BEACONS = ["52,227,160", "239,155,62", "224,87,75"];
    for (let i = 0; i < Math.min(5, P.length); i++) {
      const p = P[(Math.random() * P.length) | 0];
      p.beacon = BEACONS[i % BEACONS.length];
      p.phase = Math.random() * 6.283;
    }
    const t0 = performance.now();

    function onMove(e) {
      mouse.x = e.clientX; mouse.y = e.clientY;
      if (glowRef.current) {
        const nx = e.clientX / window.innerWidth - 0.5;
        const ny = e.clientY / window.innerHeight - 0.5;
        glowRef.current.style.setProperty("--px", (nx * 42).toFixed(1) + "px");
        glowRef.current.style.setProperty("--py", (ny * 42).toFixed(1) + "px");
      }
    }
    function onLeave() { mouse.x = -9999; mouse.y = -9999; }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseout", onLeave);
    window.addEventListener("resize", resize);

    function frame() {
      raf = requestAnimationFrame(frame);
      ctx.clearRect(0, 0, w, h);

      for (const p of P) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x += w; else if (p.x > w) p.x -= w;
        if (p.y < 0) p.y += h; else if (p.y > h) p.y -= h;
      }

      // links: particle↔particle, and particle→cursor (the interactive part)
      for (let i = 0; i < P.length; i++) {
        const a = P[i];
        const dmx = a.x - mouse.x, dmy = a.y - mouse.y;
        const dm = Math.hypot(dmx, dmy);
        if (dm < 170) {
          ctx.strokeStyle = `rgba(52,227,160,${0.55 * (1 - dm / 170)})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
        for (let j = i + 1; j < P.length; j++) {
          const b = P[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 124) {
            ctx.strokeStyle = `rgba(126,178,201,${0.15 * (1 - d / 124)})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      // nodes — beacons pulse in severity colours; the rest brighten near the cursor
      const t = (performance.now() - t0) / 1000;
      for (const p of P) {
        if (p.beacon) {
          const pulse = 0.55 + 0.45 * Math.abs(Math.sin(t * 1.8 + p.phase));
          ctx.fillStyle = `rgba(${p.beacon},${0.2 * pulse})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, 3 + 7 * pulse, 0, 6.283); ctx.fill();
          ctx.fillStyle = `rgba(${p.beacon},0.95)`;
          ctx.beginPath(); ctx.arc(p.x, p.y, 2.6, 0, 6.283); ctx.fill();
        } else {
          const near = Math.hypot(p.x - mouse.x, p.y - mouse.y) < 170;
          ctx.fillStyle = near ? "rgba(140,244,214,0.95)" : "rgba(150,190,212,0.5)";
          ctx.beginPath(); ctx.arc(p.x, p.y, near ? 2.5 : 1.5, 0, 6.283); ctx.fill();
        }
      }
    }

    if (reduce) {
      // static dots only
      for (const p of P) { ctx.fillStyle = "rgba(150,190,212,0.5)"; ctx.beginPath(); ctx.arc(p.x, p.y, 1.5, 0, 6.283); ctx.fill(); }
    } else {
      frame();
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onLeave);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0" style={{ background: "radial-gradient(130% 110% at 50% -10%, #0d2439 0%, #081420 60%, #050c14 100%)" }} />

      {/* parallax depth glows (follow the mouse at different depths) */}
      <div ref={glowRef} className="absolute inset-0" style={{ "--px": "0px", "--py": "0px" }}>
        <div className="absolute rounded-full" style={{ width: "48vmax", height: "48vmax", left: "-12vmax", top: "-16vmax", background: "radial-gradient(circle, rgba(22,163,148,.22), transparent 65%)", filter: "blur(55px)", transform: "translate(calc(var(--px) * 1.8), calc(var(--py) * 1.8))", transition: "transform .4s cubic-bezier(.22,1,.36,1)" }} />
        <div className="absolute rounded-full" style={{ width: "42vmax", height: "42vmax", right: "-14vmax", bottom: "-18vmax", background: "radial-gradient(circle, rgba(42,77,116,.3), transparent 65%)", filter: "blur(55px)", transform: "translate(calc(var(--px) * -1.3), calc(var(--py) * -1.3))", transition: "transform .4s cubic-bezier(.22,1,.36,1)" }} />
        <div className="absolute rounded-full" style={{ width: "26vmax", height: "26vmax", left: "42%", top: "28%", background: "radial-gradient(circle, rgba(52,227,160,.12), transparent 65%)", filter: "blur(45px)", transform: "translate(calc(var(--px) * 2.7), calc(var(--py) * 2.7))", transition: "transform .4s cubic-bezier(.22,1,.36,1)" }} />
      </div>

      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* masked grid — subtle structure */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg,#fff 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          WebkitMaskImage: "radial-gradient(circle at 50% 45%, #000, transparent 75%)",
          maskImage: "radial-gradient(circle at 50% 45%, #000, transparent 75%)",
        }}
      />
      {/* vignette focuses the eye on the card */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(100% 80% at 50% 46%, transparent 42%, rgba(3,8,14,.62))" }} />
    </div>
  );
}
