import { useEffect, useRef } from "react";
import * as THREE from "three";

// Ambient LIVE province plate for the sign-in screen — the Command Center's
// visual language put to work: a slowly turning 3D B.C. silhouette with real
// incident beacons (public feed data only). Purely ambient: transparent canvas,
// no pointer events, very slow motion, and it simply doesn't render if WebGL
// or data is unavailable (the calm backdrop underneath remains).

const BOUNDS = { minLat: 48, maxLat: 60.1, minLon: -139.1, maxLon: -114 };
const MAP_W = 40, MAP_H = 30;
const BC_OUTLINE = [
  [-114.05, 49.0], [-123.3, 49.0], [-123.1, 48.35], [-124.8, 48.3], [-126.9, 49.8],
  [-128.4, 51.6], [-131.2, 52.2], [-133.2, 53.3], [-133.1, 54.2], [-130.5, 54.7],
  [-130.0, 56.0], [-132.2, 57.1], [-133.8, 58.2], [-136.2, 59.3], [-139.05, 60.0],
  [-120.0, 60.0], [-120.0, 53.8],
];
const SEV = {
  critical: { color: 0xe0574b, r: 0.30 },
  high: { color: 0xef9b3e, r: 0.22 },
  medium: { color: 0xe7c33c, r: 0.16 },
  low: { color: 0x43bd8b, r: 0.13 },
};

const toWorld = (lat, lon) => [
  ((lon - BOUNDS.minLon) / (BOUNDS.maxLon - BOUNDS.minLon) - 0.5) * MAP_W,
  (0.5 - (lat - BOUNDS.minLat) / (BOUNDS.maxLat - BOUNDS.minLat)) * MAP_H,
];

export default function LiveMapBackdrop({ points = [] }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !points.length) return;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      return; // no WebGL — calm backdrop underneath carries the screen
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const W = () => mount.clientWidth, H = () => mount.clientHeight;
    renderer.setSize(W(), H());
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, W() / H(), 0.1, 300);
    camera.position.set(11, 23, 34); // biased right so the plate sits left of the card
    camera.lookAt(0, 0, 0);

    const group = new THREE.Group();
    scene.add(group);

    // extruded B.C. silhouette
    const shape = new THREE.Shape();
    BC_OUTLINE.forEach(([lon, lat], i) => {
      const [x, z] = toWorld(lat, lon);
      i === 0 ? shape.moveTo(x, -z) : shape.lineTo(x, -z);
    });
    const plateGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.65, bevelEnabled: false });
    const plate = new THREE.Mesh(plateGeo, new THREE.MeshBasicMaterial({ color: 0x0d2236, transparent: true, opacity: 0.9 }));
    plate.rotation.x = -Math.PI / 2;
    group.add(plate);
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(plateGeo, 12),
      new THREE.LineBasicMaterial({ color: 0x2fd4b0, transparent: true, opacity: 0.55 })
    );
    edges.rotation.x = -Math.PI / 2;
    group.add(edges);

    // live incident beacons (shared geometry+materials; tiny scene)
    const orb = new THREE.SphereGeometry(1, 10, 10);
    const mats = Object.fromEntries(
      Object.entries(SEV).map(([k, v]) => [k, new THREE.MeshBasicMaterial({ color: v.color, transparent: true, opacity: 0.95 })])
    );
    const pulses = [];
    for (const p of points.slice(0, 300)) {
      if (p.latitude == null) continue;
      const [x, z] = toWorld(p.latitude, p.longitude);
      const s = SEV[p.severity] || SEV.low;
      const m = new THREE.Mesh(orb, mats[p.severity] || mats.low);
      m.scale.setScalar(s.r);
      m.position.set(x, 0.85, z);
      group.add(m);
      if (p.severity === "critical") pulses.push(m);
    }

    const clk = new THREE.Clock();
    let raf;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const t = clk.getElapsedTime();
      if (!reduced) {
        group.rotation.y = t * 0.045; // one turn ≈ 2¼ minutes — calm by design
        pulses.forEach((m, i) => m.scale.setScalar(SEV.critical.r * (1 + 0.28 * Math.abs(Math.sin(t * 1.6 + i)))));
      }
      renderer.render(scene, camera);
    };
    tick();

    const onResize = () => {
      camera.aspect = W() / H();
      camera.updateProjectionMatrix();
      renderer.setSize(W(), H());
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      plateGeo.dispose();
      orb.dispose();
      Object.values(mats).forEach((m) => m.dispose());
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [points]);

  return <div ref={mountRef} aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-80" />;
}
