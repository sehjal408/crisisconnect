import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { X, LogOut, Crosshair } from "lucide-react";
import { incidents as incidentsApi, requests as requestsApi, volunteers as volApi } from "../../api/services";
import { SEVERITY, INCIDENT_TYPE, PRIORITY, priorityBand } from "../../lib/meta";

/* ============================================================
   COMMAND CENTER — a 3D emergency operations room.
   The B.C. map is the centre of the space; live feeds orbit it as
   satellites; citizen requests float as interactive nodes; volunteers
   glide across the plate as response units. three.js + bloom.
   ============================================================ */

const BOUNDS = { minLat: 48, maxLat: 60.1, minLon: -139.1, maxLon: -114 };
const MAP_W = 46, MAP_H = 34;

// simplified B.C. silhouette (lon, lat) — same outline the ingest filter uses
const BC_OUTLINE = [
  [-114.05, 49.0], [-123.3, 49.0], [-123.1, 48.35], [-124.8, 48.3], [-126.9, 49.8],
  [-128.4, 51.6], [-131.2, 52.2], [-133.2, 53.3], [-133.1, 54.2], [-130.5, 54.7],
  [-130.0, 56.0], [-132.2, 57.1], [-133.8, 58.2], [-136.2, 59.3], [-139.05, 60.0],
  [-120.0, 60.0], [-120.0, 53.8],
];

const SEV_COLOR = { critical: 0xe0574b, high: 0xef9b3e, medium: 0xe7c33c, low: 0x43bd8b };
const PRI_COLOR = { critical: 0xe0574b, urgent: 0xef9b3e, standard: 0x2e86de, low: 0x8a97a3 };
const BEACON_H = { critical: 2.4, high: 1.8, medium: 1.25, low: 0.85 };

const FEEDS = [
  { source: "BC Wildfire Service", label: "BC WILDFIRE" },
  { source: "DriveBC", label: "DRIVEBC ROADS" },
  { source: "BC River Forecast Centre", label: "RIVER FORECAST" },
  { source: "EmergencyInfoBC", label: "EVACUATIONS" },
  { source: "Environment Canada", label: "EC WEATHER" },
  { source: "Environment Canada (AQHI)", label: "AIR QUALITY" },
  { source: "USGS", label: "USGS SEISMIC" },
];

const toWorld = (lat, lon) => [
  ((lon - BOUNDS.minLon) / (BOUNDS.maxLon - BOUNDS.minLon) - 0.5) * MAP_W,
  (0.5 - (lat - BOUNDS.minLat) / (BOUNDS.maxLat - BOUNDS.minLat)) * MAP_H,
];

// deterministic pseudo-position for requests without coordinates
function pseudoPos(id) {
  const a = Math.sin(id * 127.1) * 0.5 + 0.5, b = Math.sin(id * 311.7) * 0.5 + 0.5;
  return toWorld(50.2 + a * 4.5, -127.5 + b * 8);
}

function labelSprite(text, sub) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 140;
  const g = c.getContext("2d");
  g.fillStyle = "rgba(6,16,26,0.62)";
  g.beginPath(); g.roundRect(56, 10, 400, 120, 18); g.fill();
  g.strokeStyle = "rgba(52,227,160,0.35)"; g.lineWidth = 2; g.stroke();
  g.textAlign = "center"; g.fillStyle = "#dcfff2";
  g.font = "700 40px system-ui, sans-serif"; g.fillText(text, 256, 64);
  g.fillStyle = "#6fe3c2"; g.font = "500 32px system-ui, sans-serif"; g.fillText(sub, 256, 108);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.scale.set(7.4, 2.0, 1);
  return s;
}

export default function CommandCenterPage() {
  const navigate = useNavigate();
  const mountRef = useRef(null);
  const apiRef = useRef({});           // three-side controls exposed to React
  const dataRef = useRef(null);
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [hover, setHover] = useState(null);
  const [sourceFilter, setSourceFilter] = useState(null);
  const [clock, setClock] = useState(new Date());
  const [webglError, setWebglError] = useState(false);

  // live clock
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // data load (admin-guarded route; services fall back to demo data offline)
  useEffect(() => {
    Promise.all([
      incidentsApi.list().catch(() => []),
      requestsApi.all().catch(() => []),
      volApi.available().catch(() => []),
    ]).then(([inc, req, vol]) => {
      const d = { incidents: inc || [], requests: (req || []).filter((r) => !["resolved", "closed"].includes(r.status)), volunteers: vol || [] };
      dataRef.current = d;
      setData(d);
    });
  }, []);

  // build the room once data is in
  useEffect(() => {
    if (!data || !mountRef.current) return;
    const mount = mountRef.current;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    } catch {
      setWebglError(true);
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const W = () => mount.clientWidth, H = () => mount.clientHeight;
    renderer.setSize(W(), H());
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050d16);
    scene.fog = new THREE.FogExp2(0x050d16, 0.0075);

    const camera = new THREE.PerspectiveCamera(52, W() / H(), 0.1, 600);
    camera.position.set(0, 82, 120); // entrance: far above, flies in

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 16;
    controls.maxDistance = 150;
    controls.maxPolarAngle = Math.PI * 0.46;
    controls.autoRotate = !reduced;
    controls.autoRotateSpeed = 0.35;

    // lights
    scene.add(new THREE.AmbientLight(0x93a7bd, 0.75));
    const key = new THREE.DirectionalLight(0xdff4ff, 1.5);
    key.position.set(34, 60, 22);
    scene.add(key);
    const rim = new THREE.PointLight(0x16a394, 40, 90);
    rim.position.set(0, 18, 0);
    scene.add(rim);

    // starfield — the room sits in a void
    {
      const n = 900, pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const v = new THREE.Vector3().randomDirection().multiplyScalar(220 + Math.random() * 160);
        pos.set([v.x, Math.abs(v.y) * 0.7 + 4, v.z], i * 3);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x8fb8c9, size: 0.5, sizeAttenuation: true, transparent: true, opacity: 0.7 })));
    }

    // floor grid
    const grid = new THREE.GridHelper(260, 64, 0x1d5a4e, 0x0e2437);
    grid.material.transparent = true;
    grid.material.opacity = 0.33;
    grid.position.y = -0.03;
    scene.add(grid);

    // ---- the B.C. map plate (extruded silhouette, glowing edges) ----
    const shape = new THREE.Shape();
    BC_OUTLINE.forEach(([lon, lat], i) => {
      const [x, z] = toWorld(lat, lon);
      i === 0 ? shape.moveTo(x, -z) : shape.lineTo(x, -z);
    });
    const plateGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.7, bevelEnabled: false });
    const plate = new THREE.Mesh(
      plateGeo,
      new THREE.MeshStandardMaterial({ color: 0x0f2a40, roughness: 0.82, metalness: 0.15 })
    );
    plate.rotation.x = -Math.PI / 2;
    scene.add(plate);
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(plateGeo, 12),
      new THREE.LineBasicMaterial({ color: 0x2fd4b0, transparent: true, opacity: 0.65 })
    );
    edges.rotation.x = -Math.PI / 2;
    scene.add(edges);

    const pickables = [];

    // ---- incident beacons: pillar (height = severity) + orb tip ----
    const pillarGeo = new THREE.CylinderGeometry(0.075, 0.075, 1, 6);
    const orbGeo = new THREE.SphereGeometry(0.21, 14, 14);
    const sevPillarMat = {}, sevOrbMat = {};
    for (const s of Object.keys(SEV_COLOR)) {
      sevPillarMat[s] = new THREE.MeshStandardMaterial({ color: 0x0a1a28, emissive: SEV_COLOR[s], emissiveIntensity: 1.1 });
      sevOrbMat[s] = new THREE.MeshStandardMaterial({ color: 0x0a1a28, emissive: SEV_COLOR[s], emissiveIntensity: 2.4 });
    }
    const beacons = [], pulses = [];
    for (const inc of data.incidents) {
      if (inc.latitude == null) continue;
      const [x, z] = toWorld(inc.latitude, inc.longitude);
      const h = BEACON_H[inc.severity] || 1;
      const g = new THREE.Group();
      const pillar = new THREE.Mesh(pillarGeo, sevPillarMat[inc.severity] || sevPillarMat.low);
      pillar.scale.y = h;
      pillar.position.y = 0.7 + h / 2;
      const orb = new THREE.Mesh(orbGeo, sevOrbMat[inc.severity] || sevOrbMat.low);
      orb.position.y = 0.7 + h + 0.14;
      orb.userData = { kind: "incident", data: inc, pos: [x, 0.7 + h, z] };
      g.add(pillar, orb);
      g.position.set(x, 0, z);
      scene.add(g);
      pickables.push(orb);
      beacons.push({ group: g, data: inc });
      if (inc.severity === "critical") pulses.push(orb);
    }

    // ---- citizen requests: floating octahedra with a drop-line ----
    const reqGeo = new THREE.OctahedronGeometry(0.32);
    const priMat = {};
    for (const p of Object.keys(PRI_COLOR)) {
      priMat[p] = new THREE.MeshStandardMaterial({ color: 0x0a1a28, emissive: PRI_COLOR[p], emissiveIntensity: 2.1 });
    }
    const reqNodes = [];
    data.requests.forEach((r, i) => {
      const [x, z] = r.latitude != null ? toWorld(r.latitude, r.longitude) : pseudoPos(r.id || i + 1);
      const band = priorityBand(r.priority_score) || "standard";
      const node = new THREE.Mesh(reqGeo, priMat[band] || priMat.standard);
      const baseY = 3.1;
      node.position.set(x, baseY, z);
      node.userData = { kind: "request", data: r, pos: [x, baseY, z], baseY, phase: i * 1.31 };
      scene.add(node);
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, 0.72, z), new THREE.Vector3(x, baseY - 0.4, z)]),
        new THREE.LineBasicMaterial({ color: PRI_COLOR[band], transparent: true, opacity: 0.35 })
      );
      scene.add(line);
      pickables.push(node);
      reqNodes.push(node);
    });

    // ---- volunteers: response units gliding between hotspots ----
    const waypoints = [
      ...reqNodes.map((n) => new THREE.Vector3(n.position.x, 0.95, n.position.z)),
      ...beacons.filter((b) => ["critical", "high"].includes(b.data.severity)).slice(0, 10)
        .map((b) => new THREE.Vector3(b.group.position.x, 0.95, b.group.position.z)),
    ];
    if (waypoints.length < 3) for (let i = 0; i < 4; i++) waypoints.push(new THREE.Vector3((Math.random() - 0.5) * 26, 0.95, (Math.random() - 0.5) * 20));
    const unitMat = new THREE.MeshStandardMaterial({ color: 0x06231c, emissive: 0x34e3a0, emissiveIntensity: 2.2 });
    const unitGeo = new THREE.ConeGeometry(0.17, 0.5, 5);
    const UP = new THREE.Vector3(0, 1, 0);
    const units = [];
    const unitCount = Math.min(Math.max(data.volunteers.length, 3), 8);
    for (let i = 0; i < unitCount; i++) {
      const m = new THREE.Mesh(unitGeo, unitMat);
      const start = waypoints[i % waypoints.length].clone();
      m.position.copy(start);
      scene.add(m);
      units.push({ m, target: waypoints[(i + 1) % waypoints.length].clone(), speed: 2.2 + Math.random() * 1.6 });
    }

    // ---- orbiting feed satellites ----
    const counts = {};
    for (const inc of data.incidents) counts[inc.source] = (counts[inc.source] || 0) + 1;
    const satGeo = new THREE.IcosahedronGeometry(0.5);
    const satMat = new THREE.MeshStandardMaterial({ color: 0x0a1c2c, emissive: 0x35d1e8, emissiveIntensity: 1.6 });
    const sats = [];
    FEEDS.forEach((f, i) => {
      const radius = 27 + i * 2.6;
      const height = 5.5 + (i % 4) * 2.1;
      const speed = (0.10 + (i % 3) * 0.035) * (i % 2 ? 1 : -1);
      // orbit ring
      const ringPts = [];
      for (let a = 0; a <= 96; a++) {
        const t = (a / 96) * Math.PI * 2;
        ringPts.push(new THREE.Vector3(Math.cos(t) * radius, height, Math.sin(t) * radius));
      }
      const ring = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(ringPts),
        new THREE.LineBasicMaterial({ color: 0x1d6a74, transparent: true, opacity: 0.22 })
      );
      scene.add(ring);
      const sat = new THREE.Mesh(satGeo, satMat.clone());
      sat.userData = { kind: "source", data: { ...f, count: counts[f.source] || 0 } };
      const label = labelSprite(f.label, `${counts[f.source] || 0} ACTIVE`);
      label.position.y = 1.5;
      sat.add(label);
      scene.add(sat);
      pickables.push(sat);
      sats.push({ sat, radius, height, speed, angle: (i / FEEDS.length) * Math.PI * 2 });
    });

    // ---- post-processing: bloom sells the control-room glow ----
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(W(), H()), 0.85, 0.65, 0.32));
    composer.addPass(new OutputPass());

    // ---- interaction: raycast hover + click, camera fly-to ----
    const ray = new THREE.Raycaster();
    const ptr = new THREE.Vector2();
    let hovered = null, downAt = null;
    const fly = { active: false, cam: new THREE.Vector3(), tgt: new THREE.Vector3() };

    apiRef.current.flyTo = (pos) => {
      fly.tgt.set(pos[0], pos[1], pos[2]);
      fly.cam.set(pos[0] + 7, pos[1] + 7, pos[2] + 11);
      fly.active = true;
    };
    apiRef.current.resetView = () => {
      fly.tgt.set(0, 0, 0);
      fly.cam.set(0, 34, 52);
      fly.active = true;
    };
    apiRef.current.setSourceFilter = (src) => {
      for (const b of beacons) {
        b.group.visible = !src || b.data.source === src;
      }
    };

    function pick(e) {
      const r = renderer.domElement.getBoundingClientRect();
      ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ptr, camera);
      const hit = ray.intersectObjects(pickables, false)[0];
      return hit ? hit.object : null;
    }
    function onMove(e) {
      const obj = pick(e);
      if (hovered && hovered !== obj) { hovered.scale.setScalar(1); hovered = null; setHover(null); document.body.style.cursor = ""; }
      if (obj && hovered !== obj) {
        hovered = obj;
        obj.scale.setScalar(1.35);
        document.body.style.cursor = "pointer";
        const u = obj.userData;
        const title = u.kind === "incident" ? u.data.title : u.kind === "request" ? `${(u.data.request_type || "request").replace(/_/g, " ")} request` : u.data.label;
        const sub = u.kind === "incident" ? `${SEVERITY[u.data.severity]?.label || ""} · ${u.data.source || ""}` :
          u.kind === "request" ? `AI priority ${u.data.priority_score ?? "—"}` : `${u.data.count} active incidents`;
        setHover({ x: e.clientX, y: e.clientY, title, sub });
      } else if (obj && hovered === obj) {
        setHover((h) => (h ? { ...h, x: e.clientX, y: e.clientY } : h));
      }
    }
    function onDown(e) { downAt = [e.clientX, e.clientY]; }
    function onUp(e) {
      if (!downAt) return;
      const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]);
      downAt = null;
      if (moved > 6) return; // was a drag, not a click
      const obj = pick(e);
      if (!obj) { setSelected(null); return; }
      const u = obj.userData;
      if (u.kind === "source") {
        setSourceFilter((cur) => {
          const next = cur === u.data.source ? null : u.data.source;
          apiRef.current.setSourceFilter(next);
          return next;
        });
        setSelected({ kind: "source", data: u.data });
      } else {
        setSelected({ kind: u.kind, data: u.data, pos: u.pos });
      }
    }
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);

    // ---- animation loop ----
    const clk = new THREE.Clock();
    let raf;
    const dir = new THREE.Vector3();
    function tick() {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(clk.getDelta(), 0.05);
      const t = clk.elapsedTime;

      // entrance / fly-to easing
      if (t < 2.6 && !fly.active) {
        camera.position.lerp(new THREE.Vector3(0, 34, 52), 0.028);
      }
      if (fly.active) {
        camera.position.lerp(fly.cam, 0.07);
        controls.target.lerp(fly.tgt, 0.09);
        if (camera.position.distanceTo(fly.cam) < 0.4) fly.active = false;
      }

      // satellites orbit the map
      for (const s of sats) {
        s.angle += s.speed * dt;
        s.sat.position.set(Math.cos(s.angle) * s.radius, s.height, Math.sin(s.angle) * s.radius);
      }
      // request nodes bob + spin
      for (const n of reqNodes) {
        n.position.y = n.userData.baseY + Math.sin(t * 1.3 + n.userData.phase) * 0.28;
        n.rotation.y += dt * 0.8;
      }
      // critical beacons pulse
      pulses.forEach((p, i) => { if (p !== hovered) p.scale.setScalar(1 + 0.3 * Math.abs(Math.sin(t * 2.4 + i))); });
      // response units glide between hotspots
      for (const u of units) {
        dir.subVectors(u.target, u.m.position);
        const d = dir.length();
        if (d < 0.6) {
          u.target = waypoints[Math.floor(Math.random() * waypoints.length)].clone();
        } else {
          dir.normalize();
          u.m.position.addScaledVector(dir, Math.min(u.speed * dt, d));
          u.m.quaternion.setFromUnitVectors(UP, dir);
        }
      }

      controls.update();
      composer.render();
    }
    tick();

    const onResize = () => {
      camera.aspect = W() / H();
      camera.updateProjectionMatrix();
      renderer.setSize(W(), H());
      composer.setSize(W(), H());
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      controls.dispose();
      composer.dispose();
      renderer.dispose();
      scene.traverse((o) => {
        o.geometry?.dispose?.();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.map?.dispose?.(); m.dispose?.(); });
      });
      document.body.style.cursor = "";
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [data]);

  const critical = data?.incidents.filter((i) => i.severity === "critical").length || 0;
  const stats = [
    { label: "INCIDENTS", value: data?.incidents.length ?? "—" },
    { label: "CRITICAL", value: critical, alert: critical > 0 },
    { label: "OPEN REQUESTS", value: data?.requests.length ?? "—" },
    { label: "UNITS", value: data ? Math.min(Math.max(data.volunteers.length, 3), 8) : "—" },
  ];

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#050d16] text-white">
      <div ref={mountRef} className="absolute inset-0" />

      {/* CRT scanlines + vignette */}
      <div className="cmd-scanlines pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(100% 90% at 50% 45%, transparent 55%, rgba(2,6,12,.6))" }} />

      {/* loading */}
      {!data && !webglError && (
        <div className="absolute inset-0 grid place-items-center text-[13px] tracking-[0.3em] text-teal-200/80">
          INITIALISING COMMAND CENTER…
        </div>
      )}
      {webglError && (
        <div className="absolute inset-0 grid place-items-center px-8 text-center text-[14px] text-white/80">
          This device could not start the 3D view (WebGL unavailable). The standard dashboard remains fully functional.
        </div>
      )}

      {/* top-left: identity */}
      <div className="pointer-events-none absolute left-5 top-5">
        <p className="text-[11px] font-bold tracking-[0.34em] text-teal-300/90">CRISISCONNECT</p>
        <h1 className="mt-1 text-[22px] font-extrabold leading-none tracking-[0.08em]">COMMAND CENTER</h1>
        <p className="mt-1.5 text-[11.5px] tracking-[0.18em] text-white/50">
          BRITISH COLUMBIA · {clock.toLocaleTimeString("en-CA", { hour12: false })}
        </p>
      </div>

      {/* top-right: stats + exit */}
      <div className="absolute right-5 top-5 flex items-start gap-2">
        <div className="flex gap-2">
          {stats.map((s) => (
            <div key={s.label} className={`rounded-xl border px-3.5 py-2 text-center backdrop-blur ${s.alert ? "border-[#e0574b]/60 bg-[#e0574b]/15" : "border-white/10 bg-white/[0.05]"}`}>
              <p className={`text-[19px] font-extrabold leading-none tabular-nums ${s.alert ? "text-[#ff8d80]" : "text-white"}`}>{s.value}</p>
              <p className="mt-1 text-[9.5px] font-semibold tracking-[0.16em] text-white/50">{s.label}</p>
            </div>
          ))}
        </div>
        <button
          onClick={() => navigate("/admin")}
          className="ml-1 flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-[12px] font-semibold text-white/80 backdrop-blur transition hover:bg-white/15"
        >
          <LogOut size={13} /> Exit
        </button>
      </div>

      {/* bottom-left: legend */}
      <div className="pointer-events-none absolute bottom-16 left-5 space-y-1.5 text-[11px] text-white/60">
        <p><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: "#e0574b" }} /> Incident beacon — height &amp; colour = severity</p>
        <p><span className="mr-2 inline-block h-2.5 w-2.5 rotate-45" style={{ background: "#2e86de" }} /> Citizen request — colour = AI priority</p>
        <p><span className="mr-2 inline-block h-0 w-0 border-x-[5px] border-b-[9px] border-x-transparent" style={{ borderBottomColor: "#34e3a0" }} /> Response unit (volunteer)</p>
        <p><span className="mr-2 inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "#35d1e8" }} /> Live feed satellite — click to isolate its incidents</p>
      </div>

      {/* bottom-right: controls hint */}
      <div className="pointer-events-none absolute bottom-16 right-5 text-right text-[11px] tracking-[0.12em] text-white/40">
        DRAG · ROTATE&nbsp;&nbsp;&nbsp;SCROLL · ZOOM&nbsp;&nbsp;&nbsp;CLICK · INSPECT
      </div>

      {/* bottom ticker */}
      {data && data.incidents.length > 0 && (
        <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-[#04101a]/85 py-2 backdrop-blur">
          <div className="cmd-ticker whitespace-nowrap text-[12px] tracking-wide text-teal-100/80">
            {[...data.incidents, ...data.incidents].map((i, k) => (
              <span key={k} className="mx-6">
                <span style={{ color: `#${(SEV_COLOR[i.severity] || 0x8a97a3).toString(16).padStart(6, "0")}` }}>●</span>{" "}
                {i.title}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* hover reticle tooltip */}
      {hover && (
        <div className="pointer-events-none fixed z-50 max-w-[300px] rounded-lg border border-teal-300/30 bg-[#04121c]/90 px-3 py-2 backdrop-blur" style={{ left: hover.x + 16, top: hover.y + 12 }}>
          <p className="text-[12.5px] font-semibold text-white">{hover.title}</p>
          <p className="text-[11px] text-teal-200/70">{hover.sub}</p>
        </div>
      )}

      {/* right inspection panel */}
      {selected && (
        <div className="animate-slide-in absolute bottom-14 right-0 top-0 z-40 w-full max-w-[340px] border-l border-white/10 bg-[#04101a]/92 p-5 backdrop-blur-md">
          <div className="flex items-start justify-between">
            <p className="text-[10.5px] font-bold tracking-[0.28em] text-teal-300/90">
              {selected.kind === "incident" ? "INCIDENT" : selected.kind === "request" ? "CITIZEN REQUEST" : "LIVE FEED"}
            </p>
            <button onClick={() => setSelected(null)} className="grid h-7 w-7 place-items-center rounded-lg text-white/60 hover:bg-white/10"><X size={15} /></button>
          </div>

          {selected.kind === "incident" && (
            <>
              <h2 className="mt-2 text-[17px] font-bold leading-snug">{selected.data.title}</h2>
              <div className="mt-3 space-y-2 text-[12.5px] text-white/75">
                <p><span className="text-white/45">Type</span> · {INCIDENT_TYPE[selected.data.type]?.label || selected.data.type}</p>
                <p><span className="text-white/45">Severity</span> · <span style={{ color: `#${(SEV_COLOR[selected.data.severity] || 0).toString(16).padStart(6, "0")}` }}>{SEVERITY[selected.data.severity]?.label}</span></p>
                <p><span className="text-white/45">Source</span> · {selected.data.source || "—"}</p>
              </div>
            </>
          )}
          {selected.kind === "request" && (
            <>
              <h2 className="mt-2 text-[17px] font-bold capitalize leading-snug">{(selected.data.request_type || "").replace(/_/g, " ")} assistance</h2>
              <div className="mt-3 space-y-2 text-[12.5px] text-white/75">
                <p><span className="text-white/45">AI priority</span> · {selected.data.priority_score ?? "—"}/100 ({PRIORITY[priorityBand(selected.data.priority_score)]?.label || "—"})</p>
                <p><span className="text-white/45">Status</span> · {selected.data.status}</p>
                <p><span className="text-white/45">People</span> · {selected.data.affected_count || 1}</p>
                {selected.data.ai_summary && <p className="rounded-lg border border-teal-300/20 bg-teal-300/5 p-2.5 text-teal-100/85">{selected.data.ai_summary}</p>}
              </div>
            </>
          )}
          {selected.kind === "source" && (
            <>
              <h2 className="mt-2 text-[17px] font-bold leading-snug">{selected.data.label}</h2>
              <p className="mt-3 text-[12.5px] text-white/75">{selected.data.count} active incidents from this feed.</p>
              <p className="mt-2 text-[12px] text-teal-200/70">
                {sourceFilter === selected.data.source ? "Isolated on the map — click the satellite again to restore all feeds." : "Click the satellite to isolate this feed's incidents on the map."}
              </p>
            </>
          )}

          {selected.pos && (
            <button
              onClick={() => apiRef.current.flyTo?.(selected.pos)}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-400/90 py-2.5 text-[13px] font-bold text-[#04222b] transition hover:bg-teal-300"
            >
              <Crosshair size={15} /> Focus camera
            </button>
          )}
          <button
            onClick={() => apiRef.current.resetView?.()}
            className="mt-2 w-full rounded-xl border border-white/15 py-2.5 text-[12.5px] font-semibold text-white/70 transition hover:bg-white/10"
          >
            Reset view
          </button>
        </div>
      )}
    </div>
  );
}
