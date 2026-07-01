/**
 * JF CUBE ENGINE v4 — "Tech Panel" aesthetic
 * Metallic silver body, teal-glass accent panels, engraved circuit
 * lines, studio grey backdrop feel. Matches brushed-metal / frosted-glass
 * sci-fi cube reference look.
 */
window.JFCube = (function () {
  var GAP = 1.06, SZ = 0.91;

  function rrp(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
    ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
    ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
    ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
  }

  /* ── Circuit line doodle — thin traces + corner brackets, like the reference image ── */
  function drawCircuitLines(c, S, alpha) {
    c.save();
    c.strokeStyle = 'rgba(230,245,250,' + alpha + ')';
    c.lineWidth = 2;
    c.lineJoin = 'round';

    /* Corner bracket traces */
    function bracket(x, y, w, h, inset) {
      c.beginPath();
      c.moveTo(x, y + inset);
      c.lineTo(x, y);
      c.lineTo(x + inset, y);
      c.stroke();
      c.beginPath();
      c.moveTo(x + w - inset, y);
      c.lineTo(x + w, y);
      c.lineTo(x + w, y + inset);
      c.stroke();
      c.beginPath();
      c.moveTo(x, y + h - inset);
      c.lineTo(x, y + h);
      c.lineTo(x + inset, y + h);
      c.stroke();
      c.beginPath();
      c.moveTo(x + w - inset, y + h);
      c.lineTo(x + w, y + h);
      c.lineTo(x + w, y + h - inset);
      c.stroke();
    }
    bracket(S*.12, S*.12, S*.76, S*.76, S*.14);
    bracket(S*.24, S*.24, S*.52, S*.52, S*.08);

    /* A couple of stray trace lines for detail */
    c.beginPath(); c.moveTo(S*.12, S*.4); c.lineTo(S*.24, S*.4); c.stroke();
    c.beginPath(); c.moveTo(S*.76, S*.62); c.lineTo(S*.88, S*.62); c.stroke();
    c.restore();
  }

  /* ── Sticker texture: silver metal + teal glass accent + circuit engraving ── */
  function makeTex(label, isLogo) {
    var S = 512;
    var cv = document.createElement('canvas'); cv.width = S; cv.height = S;
    var c = cv.getContext('2d');

    /* Base: brushed silver-grey panel */
    var bg = c.createLinearGradient(0, 0, S, S);
    bg.addColorStop(0,   '#dfe6ea');
    bg.addColorStop(.35, '#aab4bc');
    bg.addColorStop(.55, '#8b969f');
    bg.addColorStop(1,   '#5c6670');
    rrp(c, 6, 6, S-12, S-12, 26); c.fillStyle = bg; c.fill();

    /* Subtle brushed-metal streaks */
    c.save();
    rrp(c, 6, 6, S-12, S-12, 26); c.clip();
    c.globalAlpha = .06;
    for (var i = 0; i < 40; i++) {
      c.strokeStyle = i % 2 ? '#fff' : '#000';
      c.lineWidth = 1;
      var yy = Math.random() * S;
      c.beginPath(); c.moveTo(0, yy); c.lineTo(S, yy + (Math.random()-.5)*30); c.stroke();
    }
    c.restore();

    /* Teal-cyan glass accent panel (bottom-right, like the reference) */
    var teal = c.createLinearGradient(S*.35, S*.35, S, S);
    teal.addColorStop(0, 'rgba(70,160,175,.05)');
    teal.addColorStop(.5, 'rgba(60,150,165,.55)');
    teal.addColorStop(1, 'rgba(40,120,135,.85)');
    c.save();
    rrp(c, 6, 6, S-12, S-12, 26); c.clip();
    c.fillStyle = teal;
    c.beginPath();
    c.moveTo(S*.42, S*.42); c.lineTo(S*.98, S*.42);
    c.lineTo(S*.98, S*.98); c.lineTo(S*.42, S*.98);
    c.closePath(); c.fill();
    /* Glass highlight streak */
    c.fillStyle = 'rgba(255,255,255,.22)';
    c.beginPath();
    c.moveTo(S*.5, S*.46); c.lineTo(S*.62, S*.46); c.lineTo(S*.5, S*.7); c.lineTo(S*.42, S*.7);
    c.closePath(); c.fill();
    c.restore();

    /* Outer border — bright metallic edge */
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2.5;
    rrp(c, 8, 8, S-16, S-16, 24); c.stroke();
    c.strokeStyle = 'rgba(20,30,35,.35)'; c.lineWidth = 1;
    rrp(c, 11, 11, S-22, S-22, 22); c.stroke();

    /* Circuit engraving */
    drawCircuitLines(c, S, .5);

    if (isLogo) {
      c.font = 'bold ' + Math.floor(S * .26) + 'px Space Grotesk,sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.shadowColor = 'rgba(30,50,55,.5)'; c.shadowBlur = 4; c.shadowOffsetY = 2;
      c.fillStyle = '#1a2226';
      c.fillText('JF', S/2, S/2);
      c.shadowBlur = 0; c.shadowOffsetY = 0;
      return new THREE.CanvasTexture(cv);
    }

    if (!label) {
      return new THREE.CanvasTexture(cv);
    }

    /* Engraved label — dark metal-etched look */
    var fs = label.length > 8 ? Math.floor(S*.088) : label.length > 5 ? Math.floor(S*.1) : Math.floor(S*.112);
    c.font = '700 ' + fs + 'px Space Grotesk,sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';

    /* Panel behind text for legibility */
    var tw = c.measureText(label).width;
    c.fillStyle = 'rgba(10,18,22,.72)';
    rrp(c, S/2 - tw/2 - 16, S*.44, tw + 32, S*.14, 8);
    c.fill();

    /* Etched shadow */
    c.fillStyle = 'rgba(0,0,0,.6)';
    c.fillText(label, S/2 + 1.5, S*.51 + 1.5);

    /* Bright cyan-white engraved face */
    c.shadowColor = '#8FF5FF'; c.shadowBlur = 14;
    c.fillStyle = '#EAFEFF';
    c.fillText(label, S/2, S*.51);
    c.shadowBlur = 0;

    return new THREE.CanvasTexture(cv);
  }

  /* ── Lights — soft studio setup: bright key, cool fill, subtle rim ── */
  function addLights(scene) {
    scene.add(new THREE.AmbientLight(0xffffff, 1.1));

    var key = new THREE.DirectionalLight(0xffffff, 3.2);
    key.position.set(5, 9, 7);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 30;
    key.shadow.camera.left = -6;
    key.shadow.camera.right = 6;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -6;
    key.shadow.radius = 6;
    scene.add(key);

    var rim = new THREE.PointLight(0x66d9e8, 3.5, 26);
    rim.position.set(-6, 1, -4);
    scene.add(rim);

    var fill = new THREE.PointLight(0xffffff, 2.0, 26);
    fill.position.set(5, -2, 6);
    scene.add(fill);

    var top2 = new THREE.DirectionalLight(0xcfe8ee, .6);
    top2.position.set(-3, 6, -2);
    scene.add(top2);

    return { rim: rim, fill: fill };
  }

  /* ── Studio backdrop: soft grey gradient + ground shadow catcher ── */
  function addStudioBackdrop(scene) {
    /* Ground plane that only receives shadow (invisible material otherwise) */
    var groundGeo = new THREE.PlaneGeometry(40, 40);
    var groundMat = new THREE.ShadowMaterial({ opacity: .35 });
    var ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2.1;
    ground.receiveShadow = true;
    scene.add(ground);

    /* Soft radial contact-shadow sprite under the cube for extra grounding
       even when the cube floats up during camera motion */
    var S = 256;
    var cv = document.createElement('canvas'); cv.width = S; cv.height = S;
    var ctx = cv.getContext('2d');
    var g = ctx.createRadialGradient(S/2, S/2, 0, S/2, S/2, S/2);
    g.addColorStop(0, 'rgba(0,0,0,.45)');
    g.addColorStop(.6, 'rgba(0,0,0,.18)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    var shadowTex = new THREE.CanvasTexture(cv);
    var shadowMat = new THREE.SpriteMaterial({ map: shadowTex, transparent: true, depthWrite: false });
    var shadowSprite = new THREE.Sprite(shadowMat);
    shadowSprite.scale.set(6.5, 6.5, 1);
    shadowSprite.position.y = -2.05;
    scene.add(shadowSprite);

    return { ground: ground, shadowSprite: shadowSprite };
  }

  /* ── Build a 3×3×3 cube ── */
  function build(scene, frontLabels, opts) {
    opts = opts || {};
    var parent = opts.parent || scene;
    var plainCenter = !!opts.plainCenter;

    var group = new THREE.Group();
    parent.add(group);

    var plainTex = makeTex(null, false);

    /* Metallic-glass body material for the plastic/metal frame between panels */
    var bodyMat = new THREE.MeshPhysicalMaterial({
      color: 0x3a4048,
      roughness: .35,
      metalness: .75,
      clearcoat: .4,
      clearcoatRoughness: .3
    });

    function oMat(tex) {
      return new THREE.MeshPhysicalMaterial({
        map: tex,
        roughness: .28,
        metalness: .55,
        clearcoat: .6,
        clearcoatRoughness: .18,
        envMapIntensity: 1.1
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

          var geo = new THREE.BoxGeometry(SZ, SZ, SZ, 2, 2, 2);
          var fd  = bz === 1 ? (fmap[bx + ',' + by] || null) : null;
          var isLogo = bz === 1 && bx === 0 && by === 0 && !fd && !plainCenter;

          var mats = [
            bx ===  1 ? oMat(plainTex) : bodyMat,
            bx === -1 ? oMat(plainTex) : bodyMat,
            by ===  1 ? oMat(plainTex) : bodyMat,
            by === -1 ? oMat(plainTex) : bodyMat,
            bz ===  1 ? oMat(fd ? makeTex(fd.label, false) : makeTex(null, isLogo)) : bodyMat,
            bz === -1 ? oMat(plainTex) : bodyMat,
          ];

          var mesh = new THREE.Mesh(geo, mats);
          mesh.position.set(bx * GAP, by * GAP, bz * GAP);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          group.add(mesh);

          pieces.push({
            mesh: mesh, gx: bx, gy: by, gz: bz,
            data: fd, isFront: bz === 1, isLogo: isLogo,
            isCenter: bz === 1 && bx === 0 && by === 0
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
    addStudioBackdrop: addStudioBackdrop,
    scatter: scatter,
    makeRaycaster: makeRaycaster,
    hitFront: hitFront,
    GAP: GAP
  };
})();
