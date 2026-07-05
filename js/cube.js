/**
 * JOEL FLOWSTACK — cube.js
 * Exact replica of the reference clip: one glass cube, the supplied video
 * playing across its faces, tumbling slowly on a neutral grey studio
 * backdrop with a soft contact shadow. Fixed behind every page.
 *
 * RULE: interaction (mouse, scroll, resize) only ever changes TRANSFORM
 * (rotation, position, camera) — never color, material, or lighting.
 * Every page loads this exact file with these exact CONFIG values, so the
 * object reads as one continuous piece of brand furniture site-wide.
 */

import * as THREE from "three";

(function () {
  "use strict";

  const canvas = document.getElementById("cube-canvas");

  /* ── FIXED CONFIG — matches the reference video, do not branch on interaction ── */
  const CONFIG = {
    videoSrc: "assets/cube-video.mp4",
    glassColor: 0xf3f5f8,       // near-clear, faint cool tint — real glass, not brand-colored
    ambientColor: 0xffffff,
    keyLightColor: 0xffffff,
    fillLightColor: 0xffffff,
    coreSize: 1.5,
    shellSize: 2.0,
    tumbleX: 0.11,               // rad/sec — matches the video's slow diagonal tumble
    tumbleY: 0.16,
    tumbleZ: 0.045,
    parallaxStrength: 0.18,
    scrollTiltStrength: 0.28,
  };

  let renderer, scene, camera, cubeGroup, core, shell, shadowMesh;
  let video, videoTexture;
  let targetX = 0, targetY = 0, curX = 0, curY = 0;
  let clock = new THREE.Clock();
  let scrollProgress = 0;
  let elapsed = 0;

  init();

  function init() {
    if (!canvas) return;
    try {
      run();
    } catch (err) {
      console.error("[cube.js] failed to initialize — check that assets/cube-video.mp4 " +
        "and the three.js CDN import both loaded (see Network tab):", err);
    }
  }

  function run() {

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
      36,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.set(0, 0.15, 7.6);

    /* ── neutral studio environment (for glass reflections) ──────────────
       Wrapped defensively: on a handful of GPUs, PMREMGenerator can throw.
       If it does, the cube still renders — just without env reflections —
       instead of the whole scene silently failing to appear. */
    try {
      scene.environment = makeStudioEnv();
    } catch (err) {
      console.warn("[cube.js] environment map skipped:", err);
    }

    /* ── neutral white studio lights — fixed, never altered by interaction ── */
    scene.add(new THREE.AmbientLight(CONFIG.ambientColor, 1.5));

    const key = new THREE.DirectionalLight(CONFIG.keyLightColor, 3.2);
    key.position.set(3.5, 5.5, 6);
    scene.add(key);

    const fill = new THREE.DirectionalLight(CONFIG.fillLightColor, 1.1);
    fill.position.set(-4, -1, 4);
    scene.add(fill);

    const top = new THREE.PointLight(CONFIG.keyLightColor, 4, 20, 2);
    top.position.set(0, 4.5, 2);
    scene.add(top);

    /* ── video texture — the supplied clip, unaltered ───────────────────── */
    video = document.createElement("video");
    video.src = CONFIG.videoSrc;
    video.muted = true;
    video.setAttribute("muted", "");
    video.loop = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.autoplay = true;
    video.crossOrigin = "anonymous";
    // Some mobile browsers (notably iOS Safari) only reliably decode video
    // used as a WebGL texture if the element is actually attached to the
    // DOM. Keep it fully hidden but present, rather than detached in memory.
    video.style.position = "fixed";
    video.style.width = "1px";
    video.style.height = "1px";
    video.style.opacity = "0";
    video.style.pointerEvents = "none";
    document.body.appendChild(video);

    video.play().catch(() => {
      const resume = () => { video.play(); window.removeEventListener("pointerdown", resume); };
      window.addEventListener("pointerdown", resume, { once: true });
    });

    videoTexture = new THREE.VideoTexture(video);
    videoTexture.colorSpace = THREE.SRGBColorSpace;
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;

    cubeGroup = new THREE.Group();
    scene.add(cubeGroup);

    /* ── video core — the cube video is the object itself ───────────────── */
    const coreGeo = new THREE.BoxGeometry(CONFIG.coreSize, CONFIG.coreSize, CONFIG.coreSize);
    const coreMat = new THREE.MeshBasicMaterial({ map: videoTexture, toneMapped: false });
    core = new THREE.Mesh(coreGeo, coreMat);
    cubeGroup.add(core);

    /* ── outer glass shell — clear, fixed material, no brand tint ───────── */
    const shellGeo = new THREE.BoxGeometry(CONFIG.shellSize, CONFIG.shellSize, CONFIG.shellSize);
    const shellMat = new THREE.MeshPhysicalMaterial({
      color: CONFIG.glassColor,
      metalness: 0,
      roughness: 0.035,
      transmission: 1,
      thickness: 1.1,
      ior: 1.5,
      iridescence: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      specularIntensity: 1,
      transparent: true,
      side: THREE.DoubleSide,
      envMapIntensity: 1.3,
    });
    shell = new THREE.Mesh(shellGeo, shellMat);
    cubeGroup.add(shell);

    /* ── soft contact shadow on the studio floor, beneath the cube ──────── */
    const shadowTex = makeShadowTexture();
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    });
    shadowMesh = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.4), shadowMat);
    shadowMesh.position.set(0, -1.7, -0.3);
    shadowMesh.rotation.x = -Math.PI / 2.35;
    scene.add(shadowMesh);

    positionForPage();

    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    animate();
  }

  /* neutral grey studio gradient, used as an environment map so the glass
     has soft real reflections to bend — no color tint. */
  function makeStudioEnv() {
    const size = 256;
    const c = document.createElement("canvas");
    c.width = size; c.height = size;
    const ctx = c.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 0, size);
    g.addColorStop(0, "#f2f2f1");
    g.addColorStop(0.5, "#d8d9d8");
    g.addColorStop(1, "#9a9b9b");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(0, size * 0.42, size, size * 0.06);

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
    g.addColorStop(0, "rgba(20,20,20,0.55)");
    g.addColorStop(0.6, "rgba(20,20,20,0.22)");
    g.addColorStop(1, "rgba(20,20,20,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
  }

  function positionForPage() {
    const mode = document.body.getAttribute("data-cube") || "center";
    if (mode === "corner") {
      cubeGroup.position.set(1.9, 0.2, 0);
      shadowMesh.position.x = 1.9;
      camera.position.set(0, 0.15, 8.3);
    } else {
      cubeGroup.position.set(0, 0, 0);
    }
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
    const max = document.documentElement.scrollHeight - window.innerHeight;
    scrollProgress = max > 0 ? window.scrollY / max : 0;
  }

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;

    // slow multi-axis tumble — matches the reference clip's diagonal roll,
    // not a flat single-axis spin
    cubeGroup.rotation.x += CONFIG.tumbleX * dt;
    cubeGroup.rotation.y += CONFIG.tumbleY * dt;
    cubeGroup.rotation.z += CONFIG.tumbleZ * dt;

    // pointer parallax — smoothed, additive on top of the tumble
    curX += (targetX - curX) * 0.04;
    curY += (targetY - curY) * 0.04;
    shell.rotation.x = cubeGroup.rotation.x + curX;
    shell.rotation.y = cubeGroup.rotation.y + curY;
    shell.rotation.z = cubeGroup.rotation.z;
    core.rotation.copy(shell.rotation);

    // gentle bob, like the clip's slow float
    cubeGroup.position.y = Math.sin(elapsed * 0.5) * 0.12;

    // scroll-linked drift back, subtle
    cubeGroup.position.z = -scrollProgress * 1.1;
    cubeGroup.rotation.z += scrollProgress * CONFIG.scrollTiltStrength * 0.15 * dt;

    renderer.render(scene, camera);
  }
})();
