/**
 * JOEL FLOWSTACK — cube.js
 * ------------------------------------------------------------------
 * A 26-piece Rubik's cube (hollow center, like a real cube) rendered
 * in glossy black/charcoal checkerboard — matching the studio-black
 * reference video. Two modes, chosen automatically per page:
 *
 *   PORTAL MODE  (#scroll-hero present, i.e. index.html)
 *     Scroll drives one continuous animation: tumble -> zoom -> lock
 *     face-forward. Once locked, the 8 outer front tiles become
 *     clickable nav squares; the center front tile shows a small
 *     nested decorative mini-cube. Clicking a tile scatters all 26
 *     pieces outward, then navigates.
 *
 *   DECORATIVE MODE  (#cube-canvas present, no #scroll-hero)
 *     Same engine, same materials, gentle idle tumble + mouse
 *     parallax. No nav behaviour.
 *
 * ARCHITECTURE — READ BEFORE EDITING
 *   The scroll-driven animation is fully STATELESS: every rotation,
 *   camera, and opacity value is recomputed from scratch each frame
 *   from `elapsed` (clock time) and `P` (scroll progress 0..1) using
 *   smoothstep/easing. Nothing is incrementally integrated frame to
 *   frame. This was a deliberate rewrite of an earlier phase-machine
 *   version that desynced; do not reintroduce mutable "current angle"
 *   state for the scroll animation.
 *
 *   The BOOT-SOLVE fly-in is the one place with real state (each
 *   piece's home/scattered position + a start timestamp), because it
 *   only runs once. Its easing (easeOutBack) legitimately overshoots
 *   past 1.0 before settling — do NOT clamp the eased output to 1,
 *   only clamp the time fraction that feeds into it. A hard final
 *   snap-to-exact-position runs once the timer passes duration, to
 *   kill any float drift.
 * ------------------------------------------------------------------
 */

import * as THREE from "three";

(function () {
  "use strict";

  const canvas = document.getElementById("cube-canvas");
  if (!canvas) {
    console.warn("[cube.js] no #cube-canvas on this page — skipping.");
    return;
  }
  if (!window.WebGLRenderingContext) {
    showFallback("This browser doesn't support WebGL, so the 3D cube can't render here. Everything else on the site still works.");
    return;
  }

  const heroEl = document.getElementById("scroll-hero");
  const PORTAL_MODE = !!heroEl;

  const NAV_ITEMS = [
    { key: "home",      label: "Home",      href: "home" },
    { key: "about",     label: "About",     href: "about" },
    { key: "services",  label: "Services",  href: "services" },
    { key: "portfolio", label: "Portfolio", href: "portfolio" },
    { key: "blog",      label: "Blog",      href: "blog" },
    { key: "contact",   label: "Contact",   href: "contact" },
    { key: "youtube",   label: "YouTube",   href: "https://youtube.com/@joelflowstack" },
    { key: "tiktok",    label: "TikTok",    href: "https://tiktok.com/@joelflowstack" },
  ];
  // Grid positions (x,y) on the front face (z = +1), in reading order
  // matching NAV_ITEMS above, skipping the center (0,0) which gets
  // the decorative mini-cube instead of a nav link.
  const FRONT_GRID = [
    [-1, 1], [0, 1], [1, 1],
    [-1, 0],         [1, 0],
    [-1,-1], [0,-1], [1,-1],
  ];

  const CONFIG = {
    pieceSize: 0.94,
    gap: 0.06,
    tileColorA: 0x0c0c0d,   // near-black checker square
    tileColorB: 0x1c1d20,   // charcoal checker square
    plasticColor: 0x030303,
    clearcoat: 1.0,
    clearcoatRoughness: 0.18,
    roughness: 0.32,
    metalness: 0.08,
    bootDuration: 1.5,      // seconds
    scatterDuration: 0.75,  // seconds
    clickPulseDuration: 170, // ms — brief "confirmed" flash before scatter begins
    lockFitMargin: 1.42,    // headroom so the 3x3 grid never touches the viewport edge when locked — was clipping top/bottom at 1.22
  };
  const GRID_SPAN = 3 * (CONFIG.pieceSize + CONFIG.gap); // full width/height of the 3x3 front face
  const LOCK_START = 0.32; // tumble ends, easing into lock begins
  const LOCK_POINT = 0.55; // fully locked + interactive from here to P=1 — a long, deliberate dwell

  let lockedCameraZ = 6; // recomputed from viewport + FOV in onResize()/init(), not a magic number

  let renderer, scene, camera, cubeGroup, shadowCatcher;
  let edgeLight = null;
  let hoveredNavIndex = -1;
  let pointerPixel = { x: -9999, y: -9999 };
  let clickPulsePiece = null;
  let clickPulseStart = 0;
  let floatingGlass = null;
  let nebulaMesh = null;
  let nebulaBaseX = 0;
  let nebulaBaseY = 0;
  let pieces = []; // {mesh, grid:{x,y,z}, home:Vector3, scattered:Vector3, delay:number, isFrontOuter:bool, navIndex:number}
  let clock = new THREE.Clock();
  let raycaster = new THREE.Raycaster();
  let pointer = new THREE.Vector2();
  let mouseTargetX = 0, mouseTargetY = 0, mouseCurX = 0, mouseCurY = 0;
  let bootStart = null;
  let bootDone = false;
  let scatterActive = false;
  let scatterStart = 0;
  let scatterTargetHref = null;
  let scrollP = 0; // 0..1, updated on scroll (portal mode only)

  try {
    init();
    animate();
  } catch (err) {
    console.error("[cube.js] failed to initialize:", err);
    showFallback("The 3D cube failed to load (see console for details). Everything else on the site still works.");
  }

  function showFallback(msg) {
    const note = document.createElement("div");
    note.textContent = msg;
    note.style.cssText =
      "position:fixed;bottom:16px;left:16px;z-index:9999;max-width:320px;" +
      "background:#0a0a0b;color:#ccc;border:1px solid #38393e;" +
      "border-radius:4px;padding:12px 14px;font:12.5px/1.4 monospace;";
    document.body.appendChild(note);
    console.warn("[cube.js]", msg);
  }

  // ---------------------------------------------------------------
  // INIT
  // ---------------------------------------------------------------
  function init() {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    // Mobile GPUs push a lot fewer pixels/sec than desktop — capping the
    // ratio lower on small viewports keeps this smooth on mid-range phones
    // without a visible sharpness hit at that screen size anyway.
    const pixelRatioCap = window.innerWidth < 760 ? 1.5 : 1.75;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioCap));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030304); // opaque — was transparent, which bled the page's blue gradient through as a visible seam once that gradient was introduced

    camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0.2, PORTAL_MODE ? 11 : 6.2);

    scene.add(new THREE.AmbientLight(0xcabaf0, 0.5)); // soft lavender tint instead of flat white — picks up the nebula's palette

    // single sharp specular key light, matching the reference video —
    // kept close to neutral white since this is the "obsidian, one hard
    // highlight" identity the cube was originally built around; too much
    // color here and it stops reading as obsidian at all.
    const key = new THREE.DirectionalLight(0xf3edff, 3.2);
    key.position.set(4, 6, 6.5);
    scene.add(key);

    // Fill leans purple, rim leans blue — together they echo the two
    // dominant tones actually present in the nebula backdrop, rather than
    // lighting the cube as if that backdrop weren't there.
    const fill = new THREE.DirectionalLight(0x9b6bd1, 0.55);
    fill.position.set(-5, -2, 3);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0x5aa8e6, 0.85);
    rim.position.set(-2, 3, -6);
    scene.add(rim);

    cubeGroup = new THREE.Group();
    scene.add(cubeGroup);

    buildPieces();
    buildShadowCatcher();
    buildNebulaBackdrop();
    buildFloatingGlass();

    lockedCameraZ = computeLockedCameraZ();

    if (PORTAL_MODE) {
      buildEdgeLights();
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
      canvas.addEventListener("pointerdown", onPortalClick);
      canvas.addEventListener("pointermove", onPortalPointerMove);
      canvas.style.cursor = "default";
    }

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("resize", onResize);

    bootStart = performance.now();

    // Two halves of the same fix, both about WebGL context accumulation:
    //
    // 1) pagehide: as soon as this page might be going into the browser's
    //    back-forward cache (bfcache), proactively release the WebGL
    //    context. Every page here creates its own THREE.WebGLRenderer;
    //    browsers cap how many live contexts a tab can hold (commonly
    //    ~16), and bfcache keeping several previous pages alive in memory
    //    burns through that budget fast. Releasing it here means a
    //    bfcached copy of this page holds zero GPU resources while it's
    //    not being looked at.
    //
    // 2) pageshow with persisted=true: this page is being restored FROM
    //    bfcache, meaning its WebGL context is the one we just released
    //    in step 1 — it's dead and can't be resurrected. Rather than try
    //    to cleverly reinitialize Three.js in place (real risk of leaked
    //    listeners or duplicate scenes), force a clean reload — the cube
    //    boots fresh, exactly like a normal first visit, and any
    //    scattered-mid-navigation state is moot because nothing carries
    //    over from a reload.
    window.addEventListener("pagehide", () => {
      try { renderer.dispose(); renderer.forceContextLoss(); } catch (e) { /* already gone — fine */ }
    });
    window.addEventListener("pageshow", (e) => {
      if (!e.persisted) return;
      window.location.reload();
    });
  }

  // ---------------------------------------------------------------
  // GEOMETRY / MATERIALS
  // ---------------------------------------------------------------
  function makeCheckerTexture(seedOffset) {
    const size = 256;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");
    const squares = 4;
    const step = size / squares;
    for (let y = 0; y < squares; y++) {
      for (let x = 0; x < squares; x++) {
        const isA = (x + y + seedOffset) % 2 === 0;
        ctx.fillStyle = isA ? "#0c0c0d" : "#1c1d20";
        ctx.fillRect(x * step, y * step, step, step);
      }
    }
    // subtle vignette for depth
    const grad = ctx.createRadialGradient(size/2, size/2, size*0.1, size/2, size/2, size*0.7);
    grad.addColorStop(0, "rgba(255,255,255,0.04)");
    grad.addColorStop(1, "rgba(0,0,0,0.25)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function makePlasticMaterial(seedOffset) {
    return new THREE.MeshPhysicalMaterial({
      map: makeCheckerTexture(seedOffset),
      color: 0xffffff,
      roughness: CONFIG.roughness,
      metalness: CONFIG.metalness,
      clearcoat: CONFIG.clearcoat,
      clearcoatRoughness: CONFIG.clearcoatRoughness,
    });
  }

  function makeBlackFaceMaterial() {
    return new THREE.MeshPhysicalMaterial({
      color: CONFIG.plasticColor,
      roughness: 0.55,
      metalness: 0.05,
      clearcoat: 0.6,
      clearcoatRoughness: 0.3,
    });
  }

  function makeLabelMaterial(text) {
    const size = 256;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#0c0c0d";
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, size - 20, size - 20);
    ctx.fillStyle = "#e9e9e8";
    ctx.font = "600 26px 'IBM Plex Mono', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // wrap long labels onto two lines if needed
    if (text.length > 8) {
      ctx.font = "600 22px 'IBM Plex Mono', monospace";
    }
    ctx.fillText(text.toUpperCase(), size / 2, size / 2);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshPhysicalMaterial({
      map: tex, color: 0xffffff,
      roughness: CONFIG.roughness, metalness: CONFIG.metalness,
      clearcoat: CONFIG.clearcoat, clearcoatRoughness: CONFIG.clearcoatRoughness,
      emissive: 0xf2f2f0, emissiveIntensity: 0, // hover/click glow, modulated per-frame in updateTileHover — neutral white, not blue
      transparent: true, opacity: 1, // enables the hover "ghosting" transparency dip
    });
  }

  // "JF" monogram — used on the center front tile and on every face of the
  // nested mini-cube, so the logo reads as one consistent mark at both scales.
  function makeLogoTexture(scale) {
    const size = 256;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#0c0c0d";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#f0f0ee";
    ctx.font = `700 ${Math.round(size * 0.42 * scale)}px 'Space Grotesk', system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("JF", size / 2, size / 2 + size * 0.02);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function makeLogoMaterial(scale = 1) {
    return new THREE.MeshPhysicalMaterial({
      map: makeLogoTexture(scale), color: 0xffffff,
      roughness: CONFIG.roughness, metalness: CONFIG.metalness,
      clearcoat: CONFIG.clearcoat, clearcoatRoughness: CONFIG.clearcoatRoughness,
    });
  }

  function buildPieces() {
    const s = CONFIG.pieceSize;
    const gap = CONFIG.gap;
    const step = s + gap;
    let navIndex = 0;

    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          if (x === 0 && y === 0 && z === 0) continue; // hollow center

          const geo = new THREE.BoxGeometry(s, s, s);
          // material order: [+x,-x,+y,-y,+z,-z]
          const isFrontOuterFace = (z === 1);
          const gridKeyMatch = isFrontOuterFace
            ? FRONT_GRID.findIndex(([gx, gy]) => gx === x && gy === y)
            : -1;

          let frontMat;
          let isCenterTile = false;
          if (z === 1 && x === 0 && y === 0) {
            isCenterTile = true;
            frontMat = makeLogoMaterial(1); // JF monogram tile; mini-cube nests on top of it
          } else if (gridKeyMatch >= 0) {
            frontMat = makeLabelMaterial(NAV_ITEMS[gridKeyMatch].label);
          } else if (z === 1) {
            frontMat = makePlasticMaterial(x + y);
          }

          const materials = [
            x === 1  ? makePlasticMaterial(y + 1) : makeBlackFaceMaterial(), // +x
            x === -1 ? makePlasticMaterial(y + 2) : makeBlackFaceMaterial(), // -x
            y === 1  ? makePlasticMaterial(x + 1) : makeBlackFaceMaterial(), // +y
            y === -1 ? makePlasticMaterial(x + 2) : makeBlackFaceMaterial(), // -y
            z === 1  ? frontMat : makePlasticMaterial(x + y + 3),            // +z
            z === -1 ? makePlasticMaterial(x + y + 4) : makeBlackFaceMaterial(), // -z
          ];

          const mesh = new THREE.Mesh(geo, materials);
          const home = new THREE.Vector3(x * step, y * step, z * step);

          // scattered start position: pushed far out along its own
          // direction from center, with jitter, for the boot-solve fly-in
          const dir = home.clone().normalize();
          if (dir.lengthSq() === 0) dir.set(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize();
          const scattered = dir.multiplyScalar(7 + Math.random() * 4).add(
            new THREE.Vector3((Math.random()-0.5)*2, (Math.random()-0.5)*2, (Math.random()-0.5)*2)
          );

          mesh.position.copy(scattered);
          mesh.rotation.set(
            (Math.random()-0.5) * Math.PI,
            (Math.random()-0.5) * Math.PI,
            (Math.random()-0.5) * Math.PI
          );

          cubeGroup.add(mesh);

          const piece = {
            mesh, home, scattered,
            delay: Math.random() * 0.35,
            isNavTile: gridKeyMatch >= 0,
            isCenterTile,
            navIndex: gridKeyMatch,
            glow: 0, // eased emissive intensity for hover/click feedback
          };
          pieces.push(piece);

          if (isCenterTile) buildMiniCube(mesh);
        }
      }
    }
  }

  // small nested decorative cube on the center front tile — same JF
  // monogram as the tile beneath it, on all six faces, at a smaller scale
  // so it stays legible on the tiny mini-cube geometry.
  function buildMiniCube(parentMesh) {
    const geo = new THREE.BoxGeometry(0.32, 0.32, 0.32);
    const materials = Array.from({ length: 6 }, () => makeLogoMaterial(0.85));
    const mini = new THREE.Mesh(geo, materials);
    mini.position.set(0, 0, CONFIG.pieceSize / 2 + 0.2);
    mini.name = "miniCube";
    parentMesh.add(mini);
  }

  function buildShadowCatcher() {
    const geo = new THREE.PlaneGeometry(20, 20);
    const mat = new THREE.ShadowMaterial({ opacity: 0.0 }); // kept subtle/off; page bg is pure black
    shadowCatcher = new THREE.Mesh(geo, mat);
    shadowCatcher.position.y = -3;
    shadowCatcher.rotation.x = -Math.PI / 2;
    shadowCatcher.visible = false; // reference video has no visible ground plane in this crop
  }

  // Procedural nebula backdrop — soft purple/blue glow far behind
  // everything else, generated on a canvas rather than sourced from an
  // external image. No hotlinking fragility, no licensing question, and
  // it's built from the exact same palette as the glass shards and site
  // theme rather than an approximate stock photo.
  function buildNebulaBackdrop() {
    const loader = new THREE.TextureLoader();
    const tex = loader.load("assets/nebula-bg.jpg");
    tex.colorSpace = THREE.SRGBColorSpace;

    // Sized to the image's real aspect ratio (794x444) so it doesn't
    // stretch/distort. A little oversized relative to the frame — that
    // headroom is what lets it shift with the parallax effect below
    // without ever revealing an edge.
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.85, depthWrite: false });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(48, 27), mat);
    plane.position.z = -16;
    scene.add(plane);
    nebulaMesh = plane;
    nebulaBaseX = plane.position.x;
    nebulaBaseY = plane.position.y;

    // Real environment map for cube reflections — from a separate load of
    // the same image so the flat plane and the reflection can be tuned
    // independently.
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    new THREE.TextureLoader().load("assets/nebula-bg.jpg", (envTex) => {
      envTex.mapping = THREE.EquirectangularReflectionMapping;
      envTex.colorSpace = THREE.SRGBColorSpace;
      scene.environment = pmremGenerator.fromEquirectangular(envTex).texture;
      envTex.dispose();
      pmremGenerator.dispose();
    });
  }

  function updateNebulaBackdrop(elapsed) {
    if (!nebulaMesh) return;
    // The interactive replacement for the paint effect: the whole backdrop
    // drifts opposite the cursor (parallax), on top of a slow ambient sway
    // and a gentle breathing scale — genuinely responds to the cursor,
    // without the live-repainted-canvas complexity that didn't land well.
    nebulaMesh.position.x = nebulaBaseX - mouseCurX * 1.4 + Math.sin(elapsed * 0.018) * 0.6;
    nebulaMesh.position.y = nebulaBaseY - mouseCurY * 0.9 + Math.cos(elapsed * 0.013) * 0.4;
    nebulaMesh.rotation.z = Math.sin(elapsed * 0.01) * 0.015;
    nebulaMesh.scale.setScalar(1 + Math.sin(elapsed * 0.02) * 0.015);
  }

  // Purple glass shards, genuinely placed behind the cube in 3D — not a
  // flat 2D overlay. Because they live in the same scene, the cube's own
  // geometry naturally occludes them when it's in front, and they catch
  // the same lights the cube does, so they read as actually being THERE
  // rather than pasted on top.
  function buildFloatingGlass() {
    const shardGeo = new THREE.OctahedronGeometry(1, 0);
    const count = window.innerWidth < 760 ? 11 : 24; // kept modest — real geometry in a shared render loop is pricier than a flat canvas pass
    floatingGlass = [];

    for (let i = 0; i < count; i++) {
      const size = 0.1 + Math.random() * 0.2;
      const mat = new THREE.MeshPhysicalMaterial({
        color: 0xe4d6ff,
        transparent: true,
        opacity: 0.5 + Math.random() * 0.25,
        roughness: 0.12,
        metalness: 0,
        transmission: 0.55,   // genuine glass-like light transmission
        thickness: 0.4,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        emissive: 0x8b5cf6,   // this is what makes them read as light sources, not just lit objects
        emissiveIntensity: 0.7,
      });
      const mesh = new THREE.Mesh(shardGeo, mat);
      mesh.scale.setScalar(size);
      mesh.position.set(
        (Math.random() - 0.5) * 8.5,
        (Math.random() - 0.5) * 5.5,
        -2.2 - Math.random() * 5.5 // behind the cube, which sits around z=0
      );
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      mesh.userData.vrx = (Math.random() - 0.5) * 0.006;
      mesh.userData.vry = (Math.random() - 0.5) * 0.008;
      mesh.userData.floatSpeed = 0.15 + Math.random() * 0.25;
      mesh.userData.floatPhase = Math.random() * Math.PI * 2;
      mesh.userData.baseY = mesh.position.y;
      mesh.userData.baseX = mesh.position.x;
      scene.add(mesh);
      floatingGlass.push(mesh);
    }
  }

  function updateFloatingGlass(elapsed) {
    if (!floatingGlass) return;
    floatingGlass.forEach((mesh) => {
      const u = mesh.userData;
      mesh.rotation.x += u.vrx;
      mesh.rotation.y += u.vry;
      // gentle bob + drift, plus a small parallax nudge toward the cursor
      // so the whole field feels reactive without any per-particle physics
      mesh.position.y = u.baseY + Math.sin(elapsed * u.floatSpeed + u.floatPhase) * 0.35;
      mesh.position.x = u.baseX + mouseCurX * 0.4;
    });
  }

  // ---------------------------------------------------------------
  // NAV LABELS (2D DOM overlay, positioned each frame from 3D)
  // ---------------------------------------------------------------
  function buildEdgeLights() {
    const stage = document.querySelector("#scroll-hero .pin-stage");
    if (!stage) return;
    const svgNS = "http://www.w3.org/2000/svg";

    const svg = document.createElementNS(svgNS, "svg");
    svg.id = "edge-light-svg";

    const defs = document.createElementNS(svgNS, "defs");
    const filter = document.createElementNS(svgNS, "filter");
    filter.id = "edgeGlow";
    filter.setAttribute("x", "-60%"); filter.setAttribute("y", "-60%");
    filter.setAttribute("width", "220%"); filter.setAttribute("height", "220%");
    const blur = document.createElementNS(svgNS, "feGaussianBlur");
    blur.setAttribute("stdDeviation", "5");
    filter.appendChild(blur);
    defs.appendChild(filter);
    svg.appendChild(defs);

    // Faint full track so the frame reads as a deliberate element even
    // where the bright sweep isn't currently passing.
    const track = document.createElementNS(svgNS, "path");
    track.setAttribute("fill", "none");
    track.setAttribute("stroke", "rgba(63,169,232,.14)");
    track.setAttribute("stroke-width", "2");
    svg.appendChild(track);

    // The bold traveling light itself — a thick, blurred, bright dash.
    const sweep = document.createElementNS(svgNS, "path");
    sweep.setAttribute("fill", "none");
    sweep.setAttribute("stroke", "#3fa9e8"); // matches --blue-glow directly (var() support in SVG presentation attrs is inconsistent)
    sweep.setAttribute("stroke-width", "5");
    sweep.setAttribute("stroke-linecap", "round");
    sweep.setAttribute("filter", "url(#edgeGlow)");
    svg.appendChild(sweep);

    // The leading dot — bright core, sits exactly on the path via
    // getPointAtLength(), so it's always precisely at the sweep's front.
    const dot = document.createElementNS(svgNS, "circle");
    dot.setAttribute("r", "6");
    dot.setAttribute("fill", "#eef8ff");
    dot.setAttribute("filter", "url(#edgeGlow)");
    svg.appendChild(dot);

    stage.appendChild(svg);
    edgeLight = { svg, track, sweep, dot, perimeter: 0 };
    layoutEdgeLights();
    window.addEventListener("resize", layoutEdgeLights);
  }

  function layoutEdgeLights() {
    if (!edgeLight) return;
    const stage = document.querySelector("#scroll-hero .pin-stage");
    if (!stage) return;
    const w = stage.clientWidth, h = stage.clientHeight;
    const inset = 3;
    edgeLight.svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    // Starts at top-center, goes clockwise: right along top, down the
    // right edge, left along the bottom, up the left edge, back to start.
    // Starting the path itself at top-center (not a corner) is what
    // makes the sweep "accurately start at the top" rather than
    // approximating it through an angular offset.
    const d = `M ${w / 2},${inset} L ${w - inset},${inset} L ${w - inset},${h - inset} L ${inset},${h - inset} L ${inset},${inset} Z`;
    edgeLight.track.setAttribute("d", d);
    edgeLight.sweep.setAttribute("d", d);
    edgeLight.perimeter = edgeLight.sweep.getTotalLength();
    const dash = edgeLight.perimeter * 0.14;
    edgeLight.sweep.setAttribute("stroke-dasharray", `${dash} ${edgeLight.perimeter - dash}`);
    edgeLight.dashLength = dash;

    // Scale the stroke/dot relative to the smaller viewport dimension —
    // a 5px stroke that looks bold on a 1920px desktop reads as oversized
    // on a 375px phone screen.
    const scale = Math.max(0.6, Math.min(1, Math.min(w, h) / 700));
    edgeLight.sweep.setAttribute("stroke-width", (5 * scale).toFixed(1));
    edgeLight.dot.setAttribute("r", (6 * scale).toFixed(1));
  }

  // Constant-speed loop around the true perimeter, computed fresh from
  // elapsed time each frame (stateless, same philosophy as the rest of
  // the portal animation) — one full lap every LOOP_SECONDS regardless
  // of screen size, so it never feels rushed on a big monitor or
  // frantic on a small one.
  function updateEdgeLights(elapsed, visibility) {
    if (!edgeLight || !edgeLight.perimeter) return;
    const LOOP_SECONDS = 10;
    const dist = (elapsed % LOOP_SECONDS) / LOOP_SECONDS * edgeLight.perimeter;
    edgeLight.sweep.setAttribute("stroke-dashoffset", -dist);

    const leadDist = (dist + edgeLight.dashLength) % edgeLight.perimeter;
    const pt = edgeLight.sweep.getPointAtLength(leadDist);
    edgeLight.dot.setAttribute("cx", pt.x);
    edgeLight.dot.setAttribute("cy", pt.y);

    // Fades in alongside the rest of the locked-hero UI rather than
    // being visible (and distracting) during the tumble.
    edgeLight.svg.style.opacity = String(Math.max(0.35, visibility));
  }

  // Raycasts from the actual pointer position (not just on click) to find
  // which nav tile, if any, is currently under the cursor, then eases
  // every nav tile's emissive glow + scale toward its target each frame —
  // smooth in and out, not a hard on/off flip.
  function updateTileHover(visibility) {
    if (!PORTAL_MODE) return;
    const interactive = visibility > 0.9 && !scatterActive;

    if (interactive) {
      pointer.x = (pointerPixel.x / window.innerWidth) * 2 - 1;
      pointer.y = -(pointerPixel.y / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const navMeshes = pieces.filter(p => p.isNavTile).map(p => p.mesh);
      const hits = raycaster.intersectObjects(navMeshes, false);
      const hitPiece = hits.length ? pieces.find(p => p.mesh === hits[0].object) : null;
      hoveredNavIndex = hitPiece ? hitPiece.navIndex : -1;
      canvas.style.cursor = hoveredNavIndex >= 0 ? "pointer" : "default";
    } else {
      hoveredNavIndex = -1;
      canvas.style.cursor = "default";
    }

    const now = performance.now();
    const pulseActive = clickPulsePiece && (now - clickPulseStart) < CONFIG.clickPulseDuration;

    pieces.forEach((p) => {
      if (!p.isNavTile) return;
      let target = (p.navIndex === hoveredNavIndex) ? 0.3 : 0; // softer, colorless glow (was a bold blue)
      let scaleTarget = (p.navIndex === hoveredNavIndex) ? 1.05 : 1;
      let opacityTarget = (p.navIndex === hoveredNavIndex) ? 0.72 : 1; // a light "ghosting" transparency dip on hover

      if (pulseActive && p === clickPulsePiece) {
        const t = (now - clickPulseStart) / CONFIG.clickPulseDuration;
        target = 0.9 * Math.sin(t * Math.PI); // quick flash, peaks mid-pulse — still colorless, just brighter
        scaleTarget = 1 + 0.14 * Math.sin(t * Math.PI);
        opacityTarget = 1;
      }

      p.glow += (target - p.glow) * 0.25;
      const frontMat = Array.isArray(p.mesh.material) ? p.mesh.material[4] : p.mesh.material;
      if (frontMat && frontMat.emissiveIntensity !== undefined) frontMat.emissiveIntensity = Math.max(0, p.glow);
      if (frontMat && frontMat.opacity !== undefined) frontMat.opacity += (opacityTarget - frontMat.opacity) * 0.25;
      const curScale = p.mesh.scale.x + (scaleTarget - p.mesh.scale.x) * 0.25;
      p.mesh.scale.setScalar(curScale);
    });

    if (clickPulsePiece && !pulseActive) clickPulsePiece = null;
  }

  // ---------------------------------------------------------------
  // EVENTS
  // ---------------------------------------------------------------
  function onMouseMove(e) {
    mouseTargetX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseTargetY = (e.clientY / window.innerHeight - 0.5) * 2;
  }

  function onResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    const pixelRatioCap = window.innerWidth < 760 ? 1.5 : 1.75;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioCap));
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    lockedCameraZ = computeLockedCameraZ();
  }

  // Distance at which the full 3x3 grid (all 9 front tiles) fits inside the
  // viewport with margin, on both axes — not a guessed constant. Recomputed
  // whenever the viewport or FOV changes so "locked" always means fully framed.
  function computeLockedCameraZ() {
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const halfSpan = (GRID_SPAN / 2) * CONFIG.lockFitMargin;

    const distForHeight = halfSpan / Math.tan(vFov / 2);

    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    const distForWidth = halfSpan / Math.tan(hFov / 2);

    return Math.max(distForHeight, distForWidth);
  }

  function onScroll() {
    if (!heroEl) return;
    const rect = heroEl.getBoundingClientRect();
    const total = heroEl.offsetHeight - window.innerHeight;
    const scrolled = -rect.top;
    scrollP = total > 0 ? Math.min(1, Math.max(0, scrolled / total)) : 0;

    // With position:fixed (not sticky), the pin-stage is ALWAYS pinned to
    // the viewport regardless of scroll — this explicitly hides it once
    // fully scrolled past, which sticky used to do on its own.
    const pinStage = document.querySelector("#scroll-hero .pin-stage");
    if (pinStage) pinStage.classList.toggle("hero-passed", scrollP >= 1);
  }

  function onPortalPointerMove(e) {
    pointerPixel.x = e.clientX;
    pointerPixel.y = e.clientY;
  }

  function onPortalClick(e) {
    if (scatterActive || bootStart === null || !bootDone) return;
    if (scrollP < LOCK_POINT) return; // interactive as soon as the cube is visually locked — not later

    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const navMeshes = pieces.filter(p => p.isNavTile).map(p => p.mesh);
    const hits = raycaster.intersectObjects(navMeshes, false);
    if (hits.length === 0) return;
    const hitMesh = hits[0].object;
    const piece = pieces.find(p => p.mesh === hitMesh);
    if (!piece) return;

    confirmTileClick(piece);
  }

  // Shared by both the raycast-on-canvas click and the DOM label click —
  // a short, obvious "this one" pulse (scale + emissive flash) before the
  // whole cube scatters, so the click reads as acknowledged rather than
  // the cube just abruptly flying apart.
  function confirmTileClick(piece) {
    if (scatterActive) return;
    clickPulsePiece = piece;
    clickPulseStart = performance.now();
    setTimeout(() => startScatter(NAV_ITEMS[piece.navIndex].href), CONFIG.clickPulseDuration);
  }

  function startScatter(href) {
    scatterActive = true;
    scatterStart = performance.now();
    scatterTargetHref = href;
  }

  // ---------------------------------------------------------------
  // EASING
  // ---------------------------------------------------------------
  function smoothstep(edge0, edge1, x) {
    const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }
  // Perlin's quintic "smootherstep" — zero first AND second derivative at
  // both ends, so the rotation eases in/out with none of smoothstep's
  // faint velocity kink. Used for the cube's own motion; smoothstep is
  // still used for simpler UI fades (opacity, labels) where it's plenty.
  function smootherstep(edge0, edge1, x) {
    const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
    return t * t * t * (t * (t * 6 - 15) + 10);
  }
  function easeOutBack(x) {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }
  function easeInOutCubic(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  // ---------------------------------------------------------------
  // ANIMATE
  // ---------------------------------------------------------------
  function animate() {
    requestAnimationFrame(animate);
    const elapsed = clock.getElapsedTime();

    mouseCurX += (mouseTargetX - mouseCurX) * 0.06;
    mouseCurY += (mouseTargetY - mouseCurY) * 0.06;

    updateBoot();
    updateFloatingGlass(elapsed);
    updateNebulaBackdrop(elapsed);
    if (scatterActive) {
      updateScatter();
    } else if (PORTAL_MODE) {
      updatePortalFrame(elapsed);
    } else {
      updateDecorativeFrame(elapsed);
    }

    renderer.render(scene, camera);
  }

  // ---- boot-solve fly-in (runs once at load, real state by design) ----
  function updateBoot() {
    if (bootDone || bootStart === null) return;
    const now = performance.now();
    let allSettled = true;
    let sumFrac = 0;

    pieces.forEach((p) => {
      const localStart = bootStart + p.delay * 1000;
      const rawFrac = (now - localStart) / (CONFIG.bootDuration * 1000);
      const x = Math.min(1, Math.max(0, rawFrac)); // clamp TIME, not the eased output
      sumFrac += x;
      if (x < 1) allSettled = false;

      const e = easeOutBack(x); // legitimately overshoots past 1 — do not clamp this
      // Vector3.lerpVectors(a, b, alpha) = a + (b-a)*alpha, with no internal
      // clamp on alpha — this is what lets the overshoot actually render.
      p.mesh.position.lerpVectors(p.scattered, p.home, e);

      if (x >= 1) {
        p.mesh.position.copy(p.home); // hard snap — kill float drift from overshoot
        p.mesh.rotation.set(0, 0, 0);
      } else {
        p.mesh.rotation.x *= (1 - x * 0.15);
        p.mesh.rotation.y *= (1 - x * 0.15);
      }
    });

    const loaderPct = document.querySelector("#boot-loader .pct");
    const loader = document.getElementById("boot-loader");
    if (loaderPct) {
      const pct = Math.round((sumFrac / pieces.length) * 100);
      loaderPct.textContent = Math.min(100, pct) + "%";
    }
    if (allSettled) {
      bootDone = true;
      if (loader) {
        loader.classList.add("hidden");
        setTimeout(() => loader.remove(), 600);
      }
    }
  }

  // ---- scatter-on-click, then navigate (own local timer, fine to be stateful: one-shot) ----
  function updateScatter() {
    const t = (performance.now() - scatterStart) / (CONFIG.scatterDuration * 1000);
    const x = Math.min(1, t);
    const e = easeInOutCubic(x);
    pieces.forEach((p) => {
      const dir = p.home.clone().normalize();
      if (dir.lengthSq() === 0) dir.set(0, 0, 1);
      const flungTarget = p.home.clone().add(dir.multiplyScalar(14));
      p.mesh.position.lerpVectors(p.home, flungTarget, e);
      p.mesh.rotation.x += 0.15;
      p.mesh.rotation.y += 0.2;
      p.mesh.scale.setScalar(p.mesh.scale.x + (1 - p.mesh.scale.x) * 0.2);
    });
    const wrap = document.getElementById("nav-tile-labels");
    if (wrap) wrap.style.opacity = String(1 - e);

    if (x >= 1 && scatterTargetHref) {
      const href = scatterTargetHref;
      scatterTargetHref = null;
      window.location.href = href;
    }
  }

  // ---- PORTAL MODE: stateless, recomputed fresh from elapsed + scrollP ----
  function updatePortalFrame(elapsed) {
    const P = scrollP;

    // Phase A 0 -> .32: dramatic tumble. Phase B .32 -> .55: eases to lock.
    // Phase C .55 -> 1: fully locked and interactive — a full 45% of the
    // scroll-hero's height is now just "sit here, take your time, click
    // a tile" rather than rushing on to the next section.
    const tumbleAmt = smootherstep(0, LOCK_START, P);
    const tumbleX = tumbleAmt * Math.PI * 2.4
      + Math.sin(elapsed * 0.3) * 0.05
      + Math.sin(elapsed * 0.72 + 1.3) * 0.02; // faster, quieter secondary layer — organic, not metronomic
    const tumbleY = tumbleAmt * Math.PI * 3.1
      + Math.cos(elapsed * 0.25) * 0.05
      + Math.cos(elapsed * 0.61 + 0.8) * 0.02;

    // Phase B: rotation eases toward locked-forward (0,0,0)
    const lockAmt = smootherstep(LOCK_START, LOCK_POINT, P);
    const rotX = tumbleX * (1 - lockAmt);
    const rotY = tumbleY * (1 - lockAmt);

    cubeGroup.rotation.set(
      rotX + mouseCurY * 0.05 * (1 - lockAmt),
      rotY + mouseCurX * 0.05 * (1 - lockAmt),
      Math.sin(elapsed * 0.2) * 0.015 * (1 - lockAmt)
    );

    // camera zoom: starting distance -> lockedCameraZ (the exact distance
    // that fully frames all 9 front tiles for the current viewport/FOV)
    const zoomAmt = smootherstep(LOCK_START, LOCK_POINT, P);
    const startZ = 17;
    camera.position.z = startZ - zoomAmt * (startZ - lockedCameraZ);
    camera.position.y = 0.2 - zoomAmt * 0.2;

    // Final approach: once locked, keep gently pushing in as the "backdoor"
    // card section starts overlapping the sticky cube underneath it —
    // tiles grow further so their scale reads as continuous with the
    // (square, cube-face-sized) cards revealed on top of them.
    const BACKDOOR_START = 0.83;
    if (P > BACKDOOR_START) {
      const finalZoomAmt = smootherstep(BACKDOOR_START, 1.0, P);
      camera.position.z -= finalZoomAmt * (lockedCameraZ * 0.18);
    }

    // Company name/tagline fades out almost immediately once scrolling
    // starts — it's meant to be seen at rest, then get out of the way the
    // instant the person engages with the cube.
    const heroBrand = document.querySelector("#scroll-hero .hero-brand");
    if (heroBrand) heroBrand.style.opacity = String(1 - smoothstep(0, 0.06, P));
    const scrollCue = document.querySelector("#scroll-hero .scroll-cue");
    if (scrollCue) scrollCue.style.opacity = String(1 - smoothstep(0, 0.08, P));

    // Labels only start appearing in the last stretch of the lock phase,
    // once rotation has mostly settled — they were previously fading in
    // across the SAME window as the rotation itself, so partially-visible
    // text was swinging along with the still-spinning cube.
    const labelAmt = smootherstep(LOCK_POINT - 0.06, LOCK_POINT, P);
    updateTileHover(labelAmt);
    updateEdgeLights(elapsed, labelAmt);

    // gentle idle spin on the mini-cube regardless of phase
    pieces.forEach((p) => {
      if (p.isCenterTile) {
        const mini = p.mesh.getObjectByName("miniCube");
        if (mini) { mini.rotation.y = elapsed * 0.6; mini.rotation.x = elapsed * 0.35; }
      }
    });
  }

  // ---- DECORATIVE MODE: idle tumble + mouse parallax ----
  function updateDecorativeFrame(elapsed) {
    cubeGroup.rotation.set(
      Math.sin(elapsed * 0.18) * 0.25 + mouseCurY * 0.15,
      elapsed * 0.14 + mouseCurX * 0.2,
      Math.sin(elapsed * 0.11) * 0.06
    );
    pieces.forEach((p) => {
      if (p.isCenterTile) {
        const mini = p.mesh.getObjectByName("miniCube");
        if (mini) { mini.rotation.y = elapsed * 0.5; mini.rotation.x = elapsed * 0.3; }
      }
    });
  }
})();
