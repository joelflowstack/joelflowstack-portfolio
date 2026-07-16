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
    { key: "home",      label: "Home",      href: "home.html" },
    { key: "about",     label: "About",     href: "about.html" },
    { key: "services",  label: "Services",  href: "services.html" },
    { key: "portfolio", label: "Portfolio", href: "portfolio.html" },
    { key: "blog",      label: "Blog",      href: "blog.html" },
    { key: "contact",   label: "Contact",   href: "contact.html" },
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
    lockFitMargin: 1.22,    // headroom so the 3x3 grid never touches the viewport edge when locked
  };
  const GRID_SPAN = 3 * (CONFIG.pieceSize + CONFIG.gap); // full width/height of the 3x3 front face

  let lockedCameraZ = 6; // recomputed from viewport + FOV in onResize()/init(), not a magic number

  let renderer, scene, camera, cubeGroup, shadowCatcher;
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
  let labelEls = new Map(); // navIndex -> DOM label element

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
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    scene = new THREE.Scene();
    scene.background = null; // page background (pure black) shows through

    camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0.2, PORTAL_MODE ? 11 : 6.2);

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));

    // single sharp specular key light, matching the reference video
    const key = new THREE.DirectionalLight(0xffffff, 3.2);
    key.position.set(4, 6, 6.5);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xaeb0b5, 0.5);
    fill.position.set(-5, -2, 3);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0xffffff, 0.8);
    rim.position.set(-2, 3, -6);
    scene.add(rim);

    cubeGroup = new THREE.Group();
    scene.add(cubeGroup);

    buildPieces();
    buildShadowCatcher();

    lockedCameraZ = computeLockedCameraZ();

    if (PORTAL_MODE) {
      buildNavLabels();
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
      canvas.addEventListener("pointerdown", onPortalClick);
      canvas.style.cursor = "default";
    }

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("resize", onResize);

    bootStart = performance.now();
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

  // ---------------------------------------------------------------
  // NAV LABELS (2D DOM overlay, positioned each frame from 3D)
  // ---------------------------------------------------------------
  function buildNavLabels() {
    const wrap = document.getElementById("nav-tile-labels");
    if (!wrap) return;
    NAV_ITEMS.forEach((item, i) => {
      const el = document.createElement("a");
      el.className = "tile-label";
      el.textContent = item.label;
      el.href = item.href;
      wrap.appendChild(el);
      labelEls.set(i, el);
    });
  }

  function updateNavLabels(lockAmount) {
    if (!PORTAL_MODE) return;
    const vector = new THREE.Vector3();
    pieces.forEach((p) => {
      if (!p.isNavTile) return;
      const el = labelEls.get(p.navIndex);
      if (!el) return;
      vector.setFromMatrixPosition(p.mesh.matrixWorld);
      vector.project(camera);
      const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
      el.style.left = x + "px";
      el.style.top = y + "px";
      el.style.opacity = String(lockAmount);
      el.style.pointerEvents = lockAmount > 0.9 ? "auto" : "none";
    });
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
  }

  function onPortalClick(e) {
    if (scatterActive || bootStart === null || !bootDone) return;
    if (scrollP < 0.85) return; // interactive as soon as the cube is visually locked — not later

    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const navMeshes = pieces.filter(p => p.isNavTile).map(p => p.mesh);
    const hits = raycaster.intersectObjects(navMeshes, false);
    if (hits.length === 0) return;
    const hitMesh = hits[0].object;
    const piece = pieces.find(p => p.mesh === hitMesh);
    if (!piece) return;

    startScatter(NAV_ITEMS[piece.navIndex].href);
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

    // Phase A 0 -> .45: dramatic tumble (multiple full rotations + idle wobble)
    const tumbleAmt = smoothstep(0, 0.45, P);
    const tumbleX = tumbleAmt * Math.PI * 2.4 + Math.sin(elapsed * 0.3) * 0.05;
    const tumbleY = tumbleAmt * Math.PI * 3.1 + Math.cos(elapsed * 0.25) * 0.05;

    // Phase B .45 -> .85: rotation lerps toward locked-forward (0,0,0)
    const lockAmt = smoothstep(0.45, 0.85, P);
    const rotX = tumbleX * (1 - lockAmt);
    const rotY = tumbleY * (1 - lockAmt);

    cubeGroup.rotation.set(
      rotX + mouseCurY * 0.05 * (1 - lockAmt),
      rotY + mouseCurX * 0.05 * (1 - lockAmt),
      Math.sin(elapsed * 0.2) * 0.015 * (1 - lockAmt)
    );

    // camera zoom: starting distance -> lockedCameraZ (the exact distance
    // that fully frames all 9 front tiles for the current viewport/FOV)
    const zoomAmt = smoothstep(0.45, 0.85, P);
    const startZ = 11;
    camera.position.z = startZ - zoomAmt * (startZ - lockedCameraZ);
    camera.position.y = 0.2 - zoomAmt * 0.2;

    // Phase C .85 -> 1: fully locked; hero copy fades, nav labels fade in
    const heroCopy = document.querySelector("#scroll-hero .hero-copy");
    if (heroCopy) heroCopy.style.opacity = String(1 - smoothstep(0.7, 0.95, P));
    const scrollCue = document.querySelector("#scroll-hero .scroll-cue");
    if (scrollCue) scrollCue.style.opacity = String(1 - smoothstep(0, 0.08, P));

    const labelAmt = smoothstep(0.65, 0.85, P);
    updateNavLabels(labelAmt);

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
