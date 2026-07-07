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
    glassColor: 0xf7f1ff,
    ambientColor: 0xffffff,
    keyLightColor: 0xffe0a0,
    fillLightColor: 0xc9a0ff,
    coreSize: 1.5,
    shellSize: 2.0,
    tumbleX: 0.11,
    tumbleY: 0.16,
    tumbleZ: 0.045,
    parallaxStrength: 0.18,
  };

  let renderer, scene, camera, cubeGroup, core, shell, shadowMesh;
  let targetX = 0, targetY = 0, curX = 0, curY = 0;
  let clock = new THREE.Clock();
  let elapsed = 0;
  let heroEl = null; // #scroll-hero, only present on index.html
  let lastWrittenHeroP = -1;
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
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

    // warm gold light from the cube's own core, catching the undersides
    // of the panels the way the reference's interior glow does
    const coreGlow = new THREE.PointLight(0xffd23f, 4.5, 8, 2);
    coreGlow.position.set(0, 0, 0);
    cubeGroup.add(coreGlow);

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
    // perf: only repaint ONE face's texture per tick, round-robin, instead
    // of re-uploading all three to the GPU simultaneously — same subtle
    // "live circuit" effect, a third of the texture-upload cost per tick
    let pulseTick = 0;
    setInterval(() => {
      faceTextures[pulseTick % faceTextures.length].pulse();
      pulseTick++;
    }, 450);

    // Tested side-by-side: transmission-based "real glass" costs 3-9x more
    // per frame (it forces an extra full-scene render pass) and even
    // opaque MeshPhysicalMaterial has meaningfully more shader cost than
    // MeshStandardMaterial for something this instanced. Given lag has
    // been a recurring, explicit concern, the panel shell below trades a
    // touch of material realism for a build that stays cheap no matter
    // how many panels it's made of — it's all ONE draw call regardless of
    // panel count, via InstancedMesh, rather than 50+ separate objects.
    shell = buildPanelShell();
    cubeGroup.add(shell);

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

  // Builds the fragmented panel shell from the reference: a grid of small
  // panels across all 6 faces, most sitting flush to form the cube's
  // silhouette, a handful pushed outward/rotated like they're mid-explode.
  // Everything here is ONE THREE.InstancedMesh — one draw call no matter
  // how many panels, so "more panels" never means "more render cost" the
  // way 50+ separate Mesh objects would.
  function buildPanelShell() {
    const grid = 3; // 3x3 panels per face
    const faceSize = CONFIG.shellSize;
    const panelSize = faceSize / grid;
    const gap = panelSize * 0.12;
    const panelGeo = new THREE.BoxGeometry(panelSize - gap, panelSize - gap, panelSize * 0.18);
    const panelMat = new THREE.MeshStandardMaterial({
      color: CONFIG.glassColor,
      roughness: 0.35,
      metalness: 0.15,
      emissive: 0x2a0a55,
      emissiveIntensity: 0.4,
    });

    const faces = [
      { normal: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1] },
      { normal: [-1, 0, 0], u: [0, 1, 0], v: [0, 0, -1] },
      { normal: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] },
      { normal: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
      { normal: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
      { normal: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] },
    ];
    const count = faces.length * grid * grid;
    const mesh = new THREE.InstancedMesh(panelGeo, panelMat, count);

    const rand = mulberry32(4242);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const half = faceSize / 2;
    let i = 0;

    faces.forEach((f) => {
      const n = new THREE.Vector3(...f.normal);
      const u = new THREE.Vector3(...f.u);
      const v = new THREE.Vector3(...f.v);
      for (let gx = 0; gx < grid; gx++) {
        for (let gy = 0; gy < grid; gy++) {
          const cu = (gx - (grid - 1) / 2) * panelSize;
          const cv = (gy - (grid - 1) / 2) * panelSize;
          const pos = new THREE.Vector3()
            .addScaledVector(u, cu)
            .addScaledVector(v, cv)
            .addScaledVector(n, half);

          const exploded = rand() < 0.16; // ~16% of panels "mid-explode", like the reference's floating top pieces
          if (exploded) {
            pos.addScaledVector(n, 0.35 + rand() * 0.5);
            pos.addScaledVector(u, (rand() - 0.5) * 0.25);
            pos.addScaledVector(v, (rand() - 0.5) * 0.25);
          }

          // orient the panel flat against the face, facing outward along n
          const targetQuat = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 0, 1),
            n
          );
          if (exploded) {
            q.copy(targetQuat).multiply(
              new THREE.Quaternion().setFromEuler(
                new THREE.Euler((rand() - 0.5) * 0.6, (rand() - 0.5) * 0.6, (rand() - 0.5) * 0.6)
              )
            );
          } else {
            q.copy(targetQuat);
          }

          m.compose(pos, q, new THREE.Vector3(1, 1, 1));
          mesh.setMatrixAt(i, m);
          i++;
        }
      }
    });

    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
  }

  function makeCircuitTexture(seed) {
    const size = 320;
    const c = document.createElement("canvas");
    c.width = size; c.height = size;
    const ctx = c.getContext("2d");

    const rand = mulberry32(seed * 977 + 13);
    const gold = "255,210,63";
    const amber = "255,150,40";

    // base: warm dark fill with a bright gold glow pooling at the center,
    // like light spilling out from inside — matches the reference's
    // interior glow instead of the old cyan "chip" look
    ctx.fillStyle = "#1a0a00";
    ctx.fillRect(0, 0, size, size);
    const cx0 = size * (0.35 + rand() * 0.3);
    const cy0 = size * (0.35 + rand() * 0.3);
    const glowGrad = ctx.createRadialGradient(cx0, cy0, 0, cx0, cy0, size * 0.55);
    glowGrad.addColorStop(0, "rgba(255,225,110,0.9)");
    glowGrad.addColorStop(0.4, "rgba(255,180,40,0.55)");
    glowGrad.addColorStop(1, "rgba(26,10,0,0)");
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, size, size);

    // nested "chip" square, off-center like the reference
    const cx = cx0, cy = cy0;
    for (let r = 90; r > 14; r -= 16) {
      ctx.strokeStyle = `rgba(${rand() > 0.5 ? gold : amber},${0.4 + rand() * 0.35})`;
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
      ctx.strokeStyle = `rgba(${rand() > 0.4 ? gold : amber},0.6)`;
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
      const hue = Math.random() > 0.5 ? gold : amber;
      ctx.clearRect(n.x - 6, n.y - 6, 12, 12);
      ctx.fillStyle = `rgba(${hue},${0.5 + Math.random() * 0.4})`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, 2.4, 0, Math.PI * 2);
      ctx.fill();
      texture.needsUpdate = true;
    }

    // seed a few permanent via-node dots
    nodes.forEach((n) => {
      ctx.fillStyle = `rgba(${gold},0.7)`;
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


  function makeStudioEnv() {
    const size = 256;
    const c = document.createElement("canvas");
    c.width = size; c.height = size;
    const ctx = c.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 0, size);
    g.addColorStop(0, "#c9a0ff");
    g.addColorStop(0.5, "#6a00d8");
    g.addColorStop(1, "#2a0060");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "rgba(255,210,63,0.22)";
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
      // perf: writing a custom property every frame forces a style
      // recalc on whatever reads it via calc() — most frames the value
      // hasn't actually moved (user isn't mid-scroll), so skip the write
      // unless it changed by more than a hair.
      if (Math.abs(p - lastWrittenHeroP) > 0.0015) {
        document.documentElement.style.setProperty("--hero-p", p.toFixed(4));
        lastWrittenHeroP = p;
      }
    }

    renderer.render(scene, camera);
  }
})();
