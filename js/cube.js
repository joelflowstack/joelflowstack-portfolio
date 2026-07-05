/**
 * JOEL FLOWSTACK — cube.js
 * The single signature object of the site: a glass/crystal cube with a
 * looping video playing on its inner faces, fixed behind every page.
 *
 * RULE: interaction (mouse, scroll, resize) is only ever allowed to change
 * TRANSFORM (rotation, position, camera) — never color, material, or
 * lighting. Every page that includes this file gets byte-identical
 * geometry, materials and lights, so the object reads as one continuous
 * piece of brand furniture site-wide.
 */

import * as THREE from "three";

(function () {
  "use strict";

  const canvas = document.getElementById("cube-canvas");

  /* ── FIXED CONFIG — do not branch this on interaction ─────────────────── */
  const CONFIG = {
    videoSrc: "assets/cube-video.mp4",
    glassColor: 0x6f8dff,
    edgeColor: 0x8fb2ff,
    ambientColor: 0x1b2550,
    keyLightColor: 0x5a7dff,
    rimLightColor: 0x9a6bff,
    fogColor: 0x05070d,
    coreSize: 1.55,
    shellSize: 2.15,
    baseSpin: 0.055,      // idle radians/sec around Y
    baseSpinX: 0.018,     // idle radians/sec around X
    parallaxStrength: 0.32,
    scrollTiltStrength: 0.5,
  };

  let renderer, scene, camera, cubeGroup, core, shell, edges;
  let video, videoTexture;
  let targetX = 0, targetY = 0, curX = 0, curY = 0;
  let clock = new THREE.Clock();
  let scrollProgress = 0;

  init();

  function init() {
    if (!canvas) return;

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(CONFIG.fogColor, 0.055);

    camera = new THREE.PerspectiveCamera(
      42,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 7.4);

    /* ── lights — fixed, never altered by interaction ───────────────────── */
    scene.add(new THREE.AmbientLight(CONFIG.ambientColor, 1.1));

    const key = new THREE.DirectionalLight(CONFIG.keyLightColor, 2.1);
    key.position.set(4, 5, 6);
    scene.add(key);

    const rim = new THREE.PointLight(CONFIG.rimLightColor, 6, 20, 2);
    rim.position.set(-4, -2, 3);
    scene.add(rim);

    const fill = new THREE.PointLight(CONFIG.keyLightColor, 2.5, 20, 2);
    fill.position.set(2, -3, -4);
    scene.add(fill);

    /* ── video texture ───────────────────────────────────────────────────── */
    video = document.createElement("video");
    video.src = CONFIG.videoSrc;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.autoplay = true;
    video.crossOrigin = "anonymous";
    video.play().catch(() => {
      // autoplay can be blocked before first gesture — retry on first interaction
      const resume = () => { video.play(); window.removeEventListener("pointerdown", resume); };
      window.addEventListener("pointerdown", resume, { once: true });
    });

    videoTexture = new THREE.VideoTexture(video);
    videoTexture.colorSpace = THREE.SRGBColorSpace;
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;

    cubeGroup = new THREE.Group();
    scene.add(cubeGroup);

    /* ── inner video core — the cube video is the object ────────────────── */
    const coreGeo = new THREE.BoxGeometry(
      CONFIG.coreSize, CONFIG.coreSize, CONFIG.coreSize,
      1, 1, 1
    );
    const coreMat = new THREE.MeshBasicMaterial({
      map: videoTexture,
      toneMapped: false,
    });
    core = new THREE.Mesh(coreGeo, coreMat);
    cubeGroup.add(core);

    /* ── outer crystal shell — glass, fixed material ─────────────────────── */
    const shellGeo = new THREE.BoxGeometry(CONFIG.shellSize, CONFIG.shellSize, CONFIG.shellSize, 1, 1, 1);
    const shellMat = new THREE.MeshPhysicalMaterial({
      color: CONFIG.glassColor,
      metalness: 0,
      roughness: 0.06,
      transmission: 1,
      thickness: 1.4,
      ior: 1.45,
      iridescence: 0.55,
      iridescenceIOR: 1.3,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
    });
    shell = new THREE.Mesh(shellGeo, shellMat);
    cubeGroup.add(shell);

    /* ── crystal edges — fixed color line accents ────────────────────────── */
    const edgeGeo = new THREE.EdgesGeometry(shellGeo);
    const edgeMat = new THREE.LineBasicMaterial({
      color: CONFIG.edgeColor,
      transparent: true,
      opacity: 0.55,
    });
    edges = new THREE.LineSegments(edgeGeo, edgeMat);
    cubeGroup.add(edges);

    // small ambient debris crystals (purely decorative, same material family)
    addDebris();

    // sizing / placement per page: hero pages centred, inner pages drift right
    positionForPage();

    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    animate();
  }

  function addDebris() {
    const debrisMat = new THREE.MeshPhysicalMaterial({
      color: 0x6f8dff,
      transmission: 1,
      roughness: 0.15,
      thickness: 0.6,
      ior: 1.4,
      iridescence: 0.4,
      transparent: true,
      opacity: 0.85,
    });
    for (let i = 0; i < 6; i++) {
      const s = 0.08 + Math.random() * 0.16;
      const geo = new THREE.BoxGeometry(s, s, s);
      const m = new THREE.Mesh(geo, debrisMat);
      const r = 3.1 + Math.random() * 1.6;
      const a = Math.random() * Math.PI * 2;
      m.position.set(Math.cos(a) * r, (Math.random() - 0.5) * 2.6, Math.sin(a) * r - 1);
      m.rotation.set(Math.random(), Math.random(), Math.random());
      m.userData.spin = 0.15 + Math.random() * 0.3;
      scene.add(m);
      (scene.userData.debris = scene.userData.debris || []).push(m);
    }
  }

  function positionForPage() {
    const mode = document.body.getAttribute("data-cube") || "center";
    if (mode === "corner") {
      cubeGroup.position.set(1.9, 0.2, 0);
      camera.position.set(0, 0, 8.2);
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

    // idle spin — transform only
    cubeGroup.rotation.y += CONFIG.baseSpin * dt;
    cubeGroup.rotation.x += CONFIG.baseSpinX * dt;

    // pointer parallax tilt — smoothed
    curX += (targetX - curX) * 0.04;
    curY += (targetY - curY) * 0.04;
    shell.rotation.x = cubeGroup.rotation.x + curX;
    shell.rotation.y = cubeGroup.rotation.y + curY;
    edges.rotation.copy(shell.rotation);
    core.rotation.x = cubeGroup.rotation.x + curX * 0.6;
    core.rotation.y = cubeGroup.rotation.y + curY * 0.6;

    // scroll-linked extra tilt + gentle push back
    cubeGroup.position.z = -scrollProgress * 1.4;
    cubeGroup.rotation.z = scrollProgress * CONFIG.scrollTiltStrength * 0.4;

    // debris drift
    (scene.userData.debris || []).forEach((m) => {
      m.rotation.x += m.userData.spin * dt;
      m.rotation.y += m.userData.spin * dt * 0.7;
    });

    renderer.render(scene, camera);
  }
})();
