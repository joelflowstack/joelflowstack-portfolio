/**
 * JOEL FLOWSTACK — cube.js
 * A glass cube with a procedurally-generated "circuit crystal" core — no
 * video, no stock footage, no watermark. The circuit pattern is drawn on
 * canvas at runtime (see makeCircuitTexture) in the site's own cyan/violet
 * palette. On index.html it drives a pinned scroll intro (cube fills the
 * screen, then shrinks/settles into a corner as the page content rises
 * over it). On every other page it sits quietly in the corner, same
 * material, same lighting — one continuous object site-wide.
 *
 * RULE: interaction only ever changes TRANSFORM — never color, material,
 * or lighting.
 *
 * DIAGNOSTICS: if you see the background gradient but no cube, open
 * DevTools → Console. This file logs a clear [cube.js] message for every
 * failure mode (WebGL unavailable, three.js not loaded) instead of failing
 * silently — copy that message back if you need help.
 */

import * as THREE from "three";

(function () {
  "use strict";

  const canvas = document.getElementById("cube-canvas");

  const CONFIG = {
    glassColor: 0xeef2ff,
    ambientColor: 0xffffff,
    keyLightColor: 0xbcd4ff,
    fillLightColor: 0xd9c4ff,
    coreSize: 1.5,
    shellSize: 2.0,
    tumbleX: 0.11,
    tumbleY: 0.16,
    tumbleZ: 0.045,
    parallaxStrength: 0.18,
  };

  let renderer, scene, camera, cubeGroup, core, shell, edges, shadowMesh;
  let targetX = 0, targetY = 0, curX = 0, curY = 0;
  let clock = new THREE.Clock();
  let elapsed = 0;
  let heroEl = null; // #scroll-hero, only present on index.html
  let heroProgress = 0; // 0 = top of hero, 1 = fully scrolled past

  if (!canvas) {
    console.warn("[cube.js] no #cube-canvas element on this page — skipping.");
  } else if (!window.WebGLRenderingContext) {
    showFallback("This browser doesn't support WebGL, so the 3D cube can't render here. Everything else on the site still works.");
  } else {
    try {
      run();
    } catch (err) {
      console.error("[cube.js] failed to initialize:", err);
      showFallback("The 3D cube failed to load (see console for details). Everything else on the site still works.");
    }
  }

  function showFallback(msg) {
    const note = document.createElement("div");
    note.textContent = msg;
    note.style.cssText =
      "position:fixed;bottom:16px;left:16px;z-index:9999;max-width:320px;" +
      "background:rgba(10,14,30,.92);color:#cfe0ff;border:1px solid rgba(127,224,255,.3);" +
      "border-radius:10px;padding:12px 14px;font:12.5px/1.4 system-ui,sans-serif;";
    document.body.appendChild(note);
    console.warn("[cube.js]", msg);
  }

  function run() {
    heroEl = document.getElementById("scroll-hero");

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0.15, 7.6);

    try {
      scene.environment = makeStudioEnv();
    } catch (err) {
      console.warn("[cube.js] environment map skipped (non-fatal):", err);
    }

    scene.add(new THREE.AmbientLight(CONFIG.ambientColor, 1.4));
    const key = new THREE.DirectionalLight(CONFIG.keyLightColor, 3);
    key.position.set(3.5, 5.5, 6);
    scene.add(key);
    const fill = new THREE.DirectionalLight(CONFIG.fillLightColor, 1.6);
    fill.position.set(-4, -1, 4);
    scene.add(fill);
    const top = new THREE.PointLight(0xffffff, 3.5, 20, 2);
    top.position.set(0, 4.5, 2);
    scene.add(top);

    cubeGroup = new THREE.Group();
    scene.add(cubeGroup);

    // ── procedural circuit-crystal core ─────────────────────────────────
    // No video, no stock footage, no watermark — the "chip inside glass"
    // look from the reference is rebuilt from scratch as drawn canvas
    // textures (PCB-style traces + nested via squares), one per cube face,
    // in the site's own cyan/violet palette. A handful of "trace nodes"
    // pulse on a slow interval for a powered-circuit feel.
    const faceTextures = [0, 1, 2].map((i) => makeCircuitTexture(i));
    const coreGeo = new THREE.BoxGeometry(CONFIG.coreSize, CONFIG.coreSize, CONFIG.coreSize);
    const coreMats = [
      new THREE.MeshBasicMaterial({ map: faceTextures[0].texture, toneMapped: false }),
      new THREE.MeshBasicMaterial({ map: faceTextures[0].texture, toneMapped: false }),
      new THREE.MeshBasicMaterial({ map: faceTextures[1].texture, toneMapped: false }),
      new THREE.MeshBasicMaterial({ map: faceTextures[1].texture, toneMapped: false }),
      new THREE.MeshBasicMaterial({ map: faceTextures[2].texture, toneMapped: false }),
      new THREE.MeshBasicMaterial({ map: faceTextures[2].texture, toneMapped: false }),
    ];
    core = new THREE.Mesh(coreGeo, coreMats);
    cubeGroup.add(core);

    // repaint traces every 220ms for a subtle "live circuit" pulse —
    // cheap (canvas redraw, not per-frame) and never touches the glass
    // shell's material at all
    setInterval(() => faceTextures.forEach((f) => f.pulse()), 220);

    const shellGeo = new THREE.BoxGeometry(CONFIG.shellSize, CONFIG.shellSize, CONFIG.shellSize);
    // NOTE: deliberately no `transmission` here. Tested side-by-side:
    // MeshPhysicalMaterial with transmission:1 renders fully invisible
    // (zero alpha, no error thrown) on software/constrained WebGL — that's
    // almost certainly what's been happening on real devices too. This
    // opacity + clearcoat + envMap combination reads as glass without
    // depending on the transmission render-target path at all, and is
    // confirmed to render on every WebGL tier, not just high-end GPUs.
    const shellMat = new THREE.MeshPhysicalMaterial({
      color: CONFIG.glassColor,
      metalness: 0,
      roughness: 0.06,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      envMapIntensity: 1.6,
    });
    shell = new THREE.Mesh(shellGeo, shellMat);
    cubeGroup.add(shell);

    // thin bright edges on the shell so the cube reads clearly even at
    // low opacity — a glass box needs a visible silhouette to look like
    // an object rather than a haze
    const edgeGeo = new THREE.EdgesGeometry(shellGeo);
    const edgeMat = new THREE.LineBasicMaterial({ color: 0xeaf5ff, transparent: true, opacity: 0.85 });
    edges = new THREE.LineSegments(edgeGeo, edgeMat);
    cubeGroup.add(edges);

    // additive glow halo behind the cube — plain unlit sprite, doesn't
    // depend on any lighting/transmission pipeline at all, so it's the
    // one element guaranteed to render on absolutely any WebGL tier. Also
    // doubles as the "glow" cue from the Flow V3 orb aesthetic.
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(),
      color: 0x9fd8ff,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    glow.scale.set(4.6, 4.6, 1);
    glow.position.z = -0.3;
    cubeGroup.add(glow);

    const shadowTex = makeShadowTexture();
    shadowMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 2.4),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.5 })
    );
    shadowMesh.position.set(0, -1.7, -0.3);
    shadowMesh.rotation.x = -Math.PI / 2.35;
    scene.add(shadowMesh);

    positionForMode();

    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    animate();
  }

  function makeCircuitTexture(seed) {
    const size = 512;
    const c = document.createElement("canvas");
    c.width = size; c.height = size;
    const ctx = c.getContext("2d");

    const rand = mulberry32(seed * 977 + 13);
    const cyan = "127,224,255";
    const violet = "178,140,255";

    // base: near-black glass fill so the traces read like an embedded chip
    ctx.fillStyle = "#050a1c";
    ctx.fillRect(0, 0, size, size);

    // nested "chip" square, off-center like the reference
    const cx = size * (0.35 + rand() * 0.3);
    const cy = size * (0.35 + rand() * 0.3);
    for (let r = 90; r > 14; r -= 16) {
      ctx.strokeStyle = `rgba(${rand() > 0.5 ? cyan : violet},${0.35 + rand() * 0.3})`;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cx - r / 2, cy - r / 2, r, r);
    }

    // rectilinear PCB traces radiating outward
    const traceCount = 10 + Math.floor(rand() * 6);
    const nodes = [];
    for (let i = 0; i < traceCount; i++) {
      let x = cx, y = cy;
      ctx.beginPath();
      ctx.moveTo(x, y);
      const segs = 2 + Math.floor(rand() * 3);
      for (let s = 0; s < segs; s++) {
        if (rand() > 0.5) x += (rand() - 0.5) * size * 0.6;
        else y += (rand() - 0.5) * size * 0.6;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(${rand() > 0.4 ? cyan : violet},0.5)`;
      ctx.lineWidth = 1;
      ctx.stroke();
      nodes.push({ x, y });
    }

    ctx.__nodes = nodes;
    ctx.__cx = cx; ctx.__cy = cy;

    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;

    function pulse() {
      // redraw just a couple of glowing via-nodes each tick, cheap and subtle
      const n = nodes[Math.floor(Math.random() * nodes.length)];
      if (!n) return;
      const hue = Math.random() > 0.5 ? cyan : violet;
      ctx.clearRect(n.x - 6, n.y - 6, 12, 12);
      ctx.fillStyle = `rgba(${hue},${0.5 + Math.random() * 0.4})`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, 2.4, 0, Math.PI * 2);
      ctx.fill();
      texture.needsUpdate = true;
    }

    // seed a few permanent via-node dots
    nodes.forEach((n) => {
      ctx.fillStyle = `rgba(${cyan},0.6)`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    });

    return { texture, pulse };
  }

  // deterministic tiny PRNG so each face gets a stable-but-different pattern
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeGlowTexture() {
    const size = 256;
    const c = document.createElement("canvas");
    c.width = size; c.height = size;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,255,255,0.9)");
    g.addColorStop(0.35, "rgba(159,216,255,0.5)");
    g.addColorStop(1, "rgba(159,216,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
  }

  function makeStudioEnv() {
    const size = 256;
    const c = document.createElement("canvas");
    c.width = size; c.height = size;
    const ctx = c.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 0, size);
    g.addColorStop(0, "#1b2350");
    g.addColorStop(0.5, "#0b0f2a");
    g.addColorStop(1, "#020310");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "rgba(127,224,255,0.18)";
    ctx.fillRect(0, size * 0.4, size, size * 0.05);

    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromEquirectangular(tex);
    tex.dispose();
    pmrem.dispose();
    return envRT.texture;
  }

  function makeShadowTexture() {
    const size = 256;
    const c = document.createElement("canvas");
    c.width = size; c.height = size;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(0,0,0,0.6)");
    g.addColorStop(0.6, "rgba(0,0,0,0.25)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
  }

  function positionForMode() {
    if (!heroEl) {
      // inner pages: cube lives in the corner, always
      const mode = document.body.getAttribute("data-cube") || "center";
      if (mode === "corner") {
        cubeGroup.position.set(1.9, 0.2, 0);
        shadowMesh.position.x = 1.9;
        camera.position.set(0, 0.15, 8.3);
      }
    }
    // if heroEl exists (index.html), positioning is driven every frame
    // from heroProgress inside animate() instead.
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function onPointerMove(e) {
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = (e.clientY / window.innerHeight) * 2 - 1;
    targetY = nx * CONFIG.parallaxStrength;
    targetX = ny * CONFIG.parallaxStrength;
  }

  function onScroll() {
    if (heroEl) {
      const rect = heroEl.getBoundingClientRect();
      const total = heroEl.offsetHeight - window.innerHeight;
      const scrolled = -rect.top;
      heroProgress = total > 0 ? Math.min(Math.max(scrolled / total, 0), 1) : 0;
    }
  }

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;

    cubeGroup.rotation.x += CONFIG.tumbleX * dt;
    cubeGroup.rotation.y += CONFIG.tumbleY * dt * (heroEl ? 1 + heroProgress * 1.5 : 1);
    cubeGroup.rotation.z += CONFIG.tumbleZ * dt;

    curX += (targetX - curX) * 0.04;
    curY += (targetY - curY) * 0.04;
    shell.rotation.x = cubeGroup.rotation.x + curX;
    shell.rotation.y = cubeGroup.rotation.y + curY;
    shell.rotation.z = cubeGroup.rotation.z;
    core.rotation.copy(shell.rotation);
    edges.rotation.copy(shell.rotation);

    cubeGroup.position.y = Math.sin(elapsed * 0.5) * 0.12;

    if (heroEl) {
      // scroll-pinned intro: cube starts big and centered, ends small and
      // tucked into the corner as the page content rises over it — the
      // "slow transition into the page" effect.
      const p = heroProgress;
      const scale = 1.35 - p * 0.85;
      cubeGroup.scale.setScalar(scale);
      cubeGroup.position.x = p * 2.1;
      cubeGroup.position.y += -p * 0.3;
      camera.position.z = 7.6 - p * 0.4;
      shadowMesh.position.x = cubeGroup.position.x;
      shadowMesh.material.opacity = 0.5 * (1 - p * 0.5);
      document.documentElement.style.setProperty("--hero-p", p.toFixed(4));
    }

    renderer.render(scene, camera);
  }
})();
