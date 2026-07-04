/**
 * JF CUBE ENGINE v6 — "Obsidian Checker" + "Crystal Glass" aesthetics
 * Obsidian: glossy black/charcoal checkerboard, pure black backdrop.
 * Crystal: faceted violet/cyan glass matching the site's --p/--plt/--cyan
 * palette, built with MeshPhysicalMaterial transmission for a real
 * refractive look instead of a flat texture.
 */
window.JFCube = (function () {
  var GAP = 1.04, SZ = 0.94;

  /* Site palette (mirrors css/global.css :root) */
  var PAL = {
    violet: 0x7B61FF,
    lilac:  0xA78BFA,
    cyan:   0x06B6D4,
    ink:    0xEDF0FF
  };

  function rrp(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
    ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
    ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
    ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
  }

  /* ── Sticker texture: obsidian checkerboard tile ──
     dark = near-black, light = charcoal, exactly like the reference.
     tone: 0 = dark tile, 1 = light tile (alternating checker pattern) */
  function makeTex(tone, label) {
    var S = 512;
    var cv = document.createElement('canvas'); cv.width = S; cv.height = S;
    var c = cv.getContext('2d');

    var base, hi, lo;
    if (tone === 1) {
      base = '#2c2c2f'; hi = '#4a4a4e'; lo = '#141416';
    } else {
      base = '#0a0a0b'; hi = '#232326'; lo = '#000000';
    }

    /* Glossy plastic gradient */
    var bg = c.createRadialGradient(S*.38, S*.3, 0, S*.5, S*.5, S*.75);
    bg.addColorStop(0, hi);
    bg.addColorStop(.45, base);
    bg.addColorStop(1, lo);
    rrp(c, 5, 5, S-10, S-10, 20); c.fillStyle = bg; c.fill();

    /* Sharp specular highlight streak — the glossy plastic "hot spot" */
    var spec = c.createRadialGradient(S*.32, S*.26, 0, S*.32, S*.26, S*.32);
    spec.addColorStop(0, 'rgba(255,255,255,.55)');
    spec.addColorStop(.25, 'rgba(255,255,255,.12)');
    spec.addColorStop(1, 'rgba(255,255,255,0)');
    c.save();
    rrp(c, 5, 5, S-10, S-10, 20); c.clip();
    c.fillStyle = spec;
    c.beginPath(); c.arc(S*.32, S*.26, S*.36, 0, Math.PI*2); c.fill();
    c.restore();

    /* Thin black bezel groove between tiles (the real cube's plastic seams) */
    c.strokeStyle = 'rgba(0,0,0,.9)'; c.lineWidth = 10;
    rrp(c, 5, 5, S-10, S-10, 20); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.05)'; c.lineWidth = 1.5;
    rrp(c, 9, 9, S-18, S-18, 17); c.stroke();

    if (label) {
      var fs = label.length > 8 ? Math.floor(S*.09) : label.length > 5 ? Math.floor(S*.1) : Math.floor(S*.115);
      c.font = '700 ' + fs + 'px Space Grotesk,sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.shadowColor = 'rgba(0,0,0,.8)'; c.shadowBlur = 6; c.shadowOffsetY = 2;
      c.fillStyle = tone === 1 ? '#f2f2f4' : '#e8e8ea';
      c.fillText(label, S/2, S/2);
      c.shadowBlur = 0; c.shadowOffsetY = 0;
    }

    return new THREE.CanvasTexture(cv);
  }

  /* Deterministic pseudo-random checker assignment per grid coordinate
     so the pattern is stable and matches a real scrambled-look cube */
  function checkerTone(a, b) {
    return ((a + b + 7) % 2);
  }

  /* ── Crystal facet texture: faint etched circuit-line pattern in
     violet/cyan, meant to catch light like a cut gem rather than
     read as a flat colour swatch ── */
  function makeCrystalTex(tone, label) {
    var S = 512;
    var cv = document.createElement('canvas'); cv.width = S; cv.height = S;
    var c = cv.getContext('2d');

    var tint = tone === 1 ? '#A78BFA' : '#06B6D4';

    var bg = c.createRadialGradient(S*.35, S*.3, 0, S*.5, S*.5, S*.8);
    bg.addColorStop(0, 'rgba(255,255,255,.14)');
    bg.addColorStop(.35, tone === 1 ? 'rgba(123,97,255,.10)' : 'rgba(6,182,212,.10)');
    bg.addColorStop(1, 'rgba(6,6,15,.04)');
    rrp(c, 4, 4, S-8, S-8, 22); c.fillStyle = bg; c.fill();

    /* faint etched facet lines */
    c.save();
    rrp(c, 4, 4, S-8, S-8, 22); c.clip();
    c.strokeStyle = tint; c.globalAlpha = .35; c.lineWidth = 1.5;
    var seed = (tone + 1) * 37;
    for (var i = 0; i < 5; i++) {
      var x1 = (Math.sin(seed + i * 12.1) * .5 + .5) * S;
      var y1 = (Math.cos(seed + i * 7.7) * .5 + .5) * S;
      var x2 = (Math.sin(seed + i * 5.3 + 2) * .5 + .5) * S;
      var y2 = (Math.cos(seed + i * 9.9 + 2) * .5 + .5) * S;
      c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    }
    c.restore();

    /* sharp glass highlight streak */
    var spec = c.createRadialGradient(S*.3, S*.24, 0, S*.3, S*.24, S*.3);
    spec.addColorStop(0, 'rgba(255,255,255,.6)');
    spec.addColorStop(.3, 'rgba(255,255,255,.14)');
    spec.addColorStop(1, 'rgba(255,255,255,0)');
    c.save();
    rrp(c, 4, 4, S-8, S-8, 22); c.clip();
    c.fillStyle = spec;
    c.beginPath(); c.arc(S*.3, S*.24, S*.34, 0, Math.PI*2); c.fill();
    c.restore();

    c.strokeStyle = 'rgba(237,240,255,.22)'; c.lineWidth = 2;
    rrp(c, 4, 4, S-8, S-8, 22); c.stroke();

    if (label) {
      var fs = label.length > 8 ? Math.floor(S*.09) : label.length > 5 ? Math.floor(S*.1) : Math.floor(S*.115);
      c.font = '700 ' + fs + 'px Space Grotesk,sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.shadowColor = 'rgba(6,6,15,.5)'; c.shadowBlur = 8; c.shadowOffsetY = 1;
      c.fillStyle = '#EDF0FF';
      c.fillText(label, S/2, S/2);
      c.shadowBlur = 0; c.shadowOffsetY = 0;
    }

    return new THREE.CanvasTexture(cv);
  }

  /* ── Lights — single hard key light + soft fill, exactly like the
     reference: one dominant specular source, near-black everywhere else ── */
  function addLights(scene) {
    scene.add(new THREE.AmbientLight(0xffffff, .18));

    var key = new THREE.DirectionalLight(0xffffff, 4.6);
    key.position.set(4, 7, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 30;
    key.shadow.camera.left = -6;
    key.shadow.camera.right = 6;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -6;
    key.shadow.radius = 3;
    scene.add(key);

    var rim = new THREE.PointLight(0xffffff, 1.4, 24);
    rim.position.set(-5, -3, -4);
    scene.add(rim);

    var fill = new THREE.PointLight(0xffffff, .5, 20);
    fill.position.set(3, -2, 5);
    scene.add(fill);

    return { rim: rim, fill: fill };
  }

  /* ── Lights for the crystal-glass cube: violet key + cyan rim so the
     transmission material has coloured light to refract ── */
  function addLightsCrystal(scene) {
    scene.add(new THREE.AmbientLight(0x1a1832, .9));

    var key = new THREE.PointLight(PAL.lilac, 16, 30, 2);
    key.position.set(4, 6, 6);
    scene.add(key);

    var rim = new THREE.PointLight(PAL.cyan, 9, 26, 2);
    rim.position.set(-5, -3, -4);
    scene.add(rim);

    var fill = new THREE.PointLight(0xffffff, 1.1, 20);
    fill.position.set(2, -2, 5);
    scene.add(fill);

    return { rim: rim, fill: fill };
  }

  /* ── Pure black studio backdrop with a soft contact shadow ── */
  function addStudioBackdrop(scene, opts) {
    opts = opts || {};
    var crystal = opts.mode === 'crystal';

    var groundGeo = new THREE.PlaneGeometry(40, 40);
    var groundMat = new THREE.ShadowMaterial({ opacity: crystal ? .4 : .55 });
    var ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2.1;
    ground.receiveShadow = true;
    scene.add(ground);

    var S = 256;
    var cv = document.createElement('canvas'); cv.width = S; cv.height = S;
    var ctx = cv.getContext('2d');
    var g = ctx.createRadialGradient(S/2, S/2, 0, S/2, S/2, S/2);
    if (crystal) {
      g.addColorStop(0, 'rgba(123,97,255,.35)');
      g.addColorStop(.6, 'rgba(6,182,212,.14)');
      g.addColorStop(1, 'rgba(6,6,15,0)');
    } else {
      g.addColorStop(0, 'rgba(0,0,0,.6)');
      g.addColorStop(.6, 'rgba(0,0,0,.22)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
    }
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    var shadowTex = new THREE.CanvasTexture(cv);
    var shadowMat = new THREE.SpriteMaterial({ map: shadowTex, transparent: true, depthWrite: false });
    var shadowSprite = new THREE.Sprite(shadowMat);
    shadowSprite.scale.set(6, 6, 1);
    shadowSprite.position.y = -2.05;
    scene.add(shadowSprite);

    return { ground: ground, shadowSprite: shadowSprite };
  }

  /* ── Build a 3×3×3 cube — obsidian checkerboard, glossy plastic ── */
  function build(scene, frontLabels, opts) {
    opts = opts || {};
    var parent = opts.parent || scene;
    var plainCenter = !!opts.plainCenter;
    var crystal = opts.mode === 'crystal';

    var group = new THREE.Group();
    parent.add(group);

    /* Body: matte-black frame (obsidian) or deep violet glass frame (crystal) */
    var bodyMat = crystal
      ? new THREE.MeshPhysicalMaterial({
          color: 0x0e0b22,
          roughness: .35,
          metalness: 0,
          transmission: .25,
          thickness: .4,
          ior: 1.4,
          clearcoat: .5,
          clearcoatRoughness: .25
        })
      : new THREE.MeshPhysicalMaterial({
          color: 0x040404,
          roughness: .5,
          metalness: 0,
          clearcoat: .3,
          clearcoatRoughness: .4
        });

    /* Cache textures per tone+label combo so we don't regenerate canvases */
    var texCache = {};
    function getTex(tone, label) {
      var key = (crystal ? 'x' : 'o') + tone + '|' + (label || '');
      if (!texCache[key]) texCache[key] = crystal ? makeCrystalTex(tone, label) : makeTex(tone, label);
      return texCache[key];
    }

    function oMat(tex) {
      return crystal
        ? new THREE.MeshPhysicalMaterial({
            map: tex,
            roughness: .06,
            metalness: 0,
            transmission: .92,
            thickness: .55,
            ior: 1.45,
            iridescence: .55,
            iridescenceIOR: 1.3,
            iridescenceThicknessRange: [100, 400],
            clearcoat: 1,
            clearcoatRoughness: .04,
            envMapIntensity: 1.2
          })
        : new THREE.MeshPhysicalMaterial({
            map: tex,
            roughness: .12,
            metalness: 0,
            clearcoat: 1,
            clearcoatRoughness: .06,
            reflectivity: .8
          });
    }

    var fmap = {};
    if (frontLabels) {
      frontLabels.forEach(function (d) { fmap[d.gx + ',' + d.gy] = d; });
    }

    var pieces = [];

    for (var bx = -1; bx <= 1; bx++) {
      for (var by = -1; by <= 1; by++) {
        for (var bz = -1; bz <= 1; bz++) {

          var geo = new THREE.BoxGeometry(SZ, SZ, SZ);
          var fd  = bz === 1 ? (fmap[bx + ',' + by] || null) : null;
          var isCenter = bz === 1 && bx === 0 && by === 0;

          /* Checker tone per face, offset per axis so the whole cube
             reads as one continuous checkerboard wrap like the reference */
          var tRight = checkerTone(by, bz);
          var tLeft  = checkerTone(by, bz + 1);
          var tTop   = checkerTone(bx, bz);
          var tBot   = checkerTone(bx, bz + 1);
          var tFront = checkerTone(bx, by);
          var tBack  = checkerTone(bx + 1, by);

          var frontLabel = fd ? fd.label : (isCenter && !plainCenter ? 'JF' : null);

          var mats = [
            bx ===  1 ? oMat(getTex(tRight, null)) : bodyMat,
            bx === -1 ? oMat(getTex(tLeft, null))  : bodyMat,
            by ===  1 ? oMat(getTex(tTop, null))   : bodyMat,
            by === -1 ? oMat(getTex(tBot, null))   : bodyMat,
            bz ===  1 ? oMat(getTex(tFront, frontLabel)) : bodyMat,
            bz === -1 ? oMat(getTex(tBack, null))  : bodyMat,
          ];

          var mesh = new THREE.Mesh(geo, mats);
          mesh.position.set(bx * GAP, by * GAP, bz * GAP);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          group.add(mesh);

          pieces.push({
            mesh: mesh, gx: bx, gy: by, gz: bz,
            data: fd, isFront: bz === 1, isLogo: isCenter && !fd,
            isCenter: isCenter
          });
        }
      }
    }

    return { group: group, pieces: pieces };
  }

  /* ── Scatter animation on navigate ── */
  function scatter(pieces, url, labelText) {
    if (!pieces || !pieces.length) { if (url) window.location.href = url; return; }

    var entEl = document.getElementById('jfEntering');
    var entTxt = document.getElementById('jfEnteringText');
    if (entEl) { entEl.classList.add('go'); if (entTxt && labelText) entTxt.textContent = 'Entering ' + labelText + '...'; }

    pieces.forEach(function (p) {
      if (Array.isArray(p.mesh.material)) {
        p.mesh.material.forEach(function (m) { if (m) m.transparent = true; });
      }
    });

    var vels = pieces.map(function (p) {
      var ox = p.gx + (Math.random() - .5) * 1.2;
      var oy = p.gy + (Math.random() - .5) * 1.2;
      var oz = (p.gz + 1) * (1.5 + Math.random());
      var spd = 9 + Math.random() * 11;
      return {
        vx: ox * spd, vy: oy * spd, vz: oz * spd,
        rx: (Math.random() - .5) * 14, ry: (Math.random() - .5) * 14, rz: (Math.random() - .5) * 14,
        op: 1
      };
    });

    var last = null;
    function tick(ts) {
      var dt = Math.min(last ? (ts - last) / 1000 : .016, .05);
      last = ts;
      var alive = false;
      pieces.forEach(function (p, i) {
        var v = vels[i];
        p.mesh.position.x += v.vx * dt;
        p.mesh.position.y += v.vy * dt;
        p.mesh.position.z += v.vz * dt;
        p.mesh.rotation.x += v.rx * dt;
        p.mesh.rotation.y += v.ry * dt;
        p.mesh.rotation.z += v.rz * dt;
        v.op = Math.max(0, v.op - dt * 2.2);
        if (v.op > 0) alive = true;
        if (Array.isArray(p.mesh.material)) {
          p.mesh.material.forEach(function (m) { if (m) m.opacity = v.op; });
        }
      });
      if (alive) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    if (url) setTimeout(function () { window.location.href = url; }, 680);
  }

  function makeRaycaster() {
    return { ray: new THREE.Raycaster(), m2: new THREE.Vector2() };
  }

  function hitFront(rc, pieces, camera, clientX, clientY, canvasEl) {
    var r = canvasEl.getBoundingClientRect();
    rc.m2.x = ((clientX - r.left) / r.width) * 2 - 1;
    rc.m2.y = -((clientY - r.top) / r.height) * 2 + 1;
    rc.ray.setFromCamera(rc.m2, camera);
    var meshes = pieces.filter(function (p) { return p.isFront; }).map(function (p) { return p.mesh; });
    var hits = rc.ray.intersectObjects(meshes, false);
    if (!hits.length) return null;
    return pieces.find(function (p) { return p.mesh === hits[0].object; }) || null;
  }

  return {
    build: build,
    addLights: addLights,
    addLightsCrystal: addLightsCrystal,
    addStudioBackdrop: addStudioBackdrop,
    scatter: scatter,
    makeRaycaster: makeRaycaster,
    hitFront: hitFront,
    GAP: GAP
  };
})();
