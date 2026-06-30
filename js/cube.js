/**
 * JF CUBE ENGINE v3
 * One engine, used on every page.
 * Requires Three.js loaded before this file.
 */
window.JFCube = (function () {
  var GAP = 1.06, SZ = 0.91;

  /* ── Round rect helper ── */
  function rrp(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
    ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
    ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
    ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
  }

  /* ── Sticker texture ── */
  function makeTex(label, isLogo) {
    var S = 512;
    var cv = document.createElement('canvas'); cv.width = S; cv.height = S;
    var c = cv.getContext('2d');

    // Dark glossy base — brighter so it reads against a pure black page
    var bg = c.createRadialGradient(S*.4, S*.35, 0, S*.5, S*.5, S*.7);
    bg.addColorStop(0, '#2a2250');
    bg.addColorStop(0.65, '#181432');
    bg.addColorStop(1, '#0d0a1e');
    rrp(c, 7, 7, S-14, S-14, 30); c.fillStyle = bg; c.fill();

    // Purple border glow — stronger
    c.strokeStyle = 'rgba(140,115,255,.6)'; c.lineWidth = 3;
    rrp(c, 9, 9, S-18, S-18, 28); c.stroke();

    // Top-left bevel — brighter highlight
    var bv = c.createLinearGradient(0, 0, S*.45, S*.45);
    bv.addColorStop(0, 'rgba(255,255,255,.13)'); bv.addColorStop(1, 'rgba(255,255,255,0)');
    rrp(c, 12, 12, S-24, S-24, 26); c.fillStyle = bv; c.fill();

    if (isLogo) {
      // JF monogram
      c.font = 'bold ' + Math.floor(S * .3) + 'px Space Grotesk,sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.shadowColor = '#7B61FF'; c.shadowBlur = 38;
      c.fillStyle = 'rgba(167,139,250,.65)';
      c.fillText('JF', S/2, S/2);
      c.shadowBlur = 0;
      return new THREE.CanvasTexture(cv);
    }

    if (!label) {
      // Outer face — subtle grid lines, brighter
      c.strokeStyle = 'rgba(130,105,220,.22)'; c.lineWidth = 1.5;
      for (var i = 1; i < 3; i++) {
        c.beginPath(); c.moveTo(S/3*i, 12); c.lineTo(S/3*i, S-12); c.stroke();
        c.beginPath(); c.moveTo(12, S/3*i); c.lineTo(S-12, S/3*i); c.stroke();
      }
      return new THREE.CanvasTexture(cv);
    }

    // Engraved label
    var fs = label.length > 8 ? Math.floor(S*.09) : label.length > 5 ? Math.floor(S*.102) : Math.floor(S*.115);
    c.font = '700 ' + fs + 'px Space Grotesk,sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';

    // Engraved depth (dark shadow slightly offset)
    c.fillStyle = 'rgba(0,0,0,.95)'; c.fillText(label, S/2+2, S/2+2);

    // Bright engraved face
    c.shadowColor = '#C0AAFF'; c.shadowBlur = 28;
    c.fillStyle = '#EEE8FF';
    c.fillText(label, S/2, S/2);
    c.shadowBlur = 0;

    // Gradient underline
    var tw = c.measureText(label).width;
    var ug = c.createLinearGradient(S/2-tw/2-10, 0, S/2+tw/2+10, 0);
    ug.addColorStop(0, 'rgba(123,97,255,0)');
    ug.addColorStop(.5, 'rgba(167,139,250,.85)');
    ug.addColorStop(1, 'rgba(123,97,255,0)');
    c.fillStyle = ug;
    c.fillRect(S/2-tw/2-10, S/2+fs*.7, tw+20, 2.5);

    return new THREE.CanvasTexture(cv);
  }

  /* ── Standard lights for any scene ── */
  function addLights(scene) {
    scene.add(new THREE.AmbientLight(0x4a4a7a, 1.1));
    var k = new THREE.DirectionalLight(0xffffff, 4.2);
    k.position.set(6, 8, 6); k.castShadow = true;
    k.shadow.mapSize.set(1024, 1024); scene.add(k);
    var r = new THREE.PointLight(0x8855ff, 7.5, 26); r.position.set(-6, -2, -5); scene.add(r);
    var f = new THREE.PointLight(0x3366ff, 5.0, 26); f.position.set(5, -3, 5); scene.add(f);
    var topLight = new THREE.DirectionalLight(0xccccff, .7);
    topLight.position.set(-2, 6, -3);
    scene.add(topLight);
    return { rim: r, fill: f };
  }

  /* ── Build a 3×3×3 Rubik's cube ──
     frontLabels: array of {gx,gy,label,url} for front face (gz=1)
     opts: { parent: Object3D (default scene), plainCenter: bool }
     If frontLabels is null/empty → plain glossy faces (still center logo unless plainCenter)
  */
  function build(scene, frontLabels, opts) {
    opts = opts || {};
    var parent = opts.parent || scene;
    var plainCenter = !!opts.plainCenter;

    var group = new THREE.Group();
    parent.add(group);

    var plainTex = makeTex(null, false);
    var bodyMat  = new THREE.MeshStandardMaterial({ color: 0x171430, roughness: .16, metalness: .25 });

    function oMat(tex) {
      return new THREE.MeshStandardMaterial({ map: tex, roughness: .1, metalness: .15 });
    }

    // Build front-face lookup
    var fmap = {};
    if (frontLabels) {
      frontLabels.forEach(function(d) { fmap[d.gx + ',' + d.gy] = d; });
    }

    var pieces = [];

    for (var bx = -1; bx <= 1; bx++) {
      for (var by = -1; by <= 1; by++) {
        for (var bz = -1; bz <= 1; bz++) {

          var geo = new THREE.BoxGeometry(SZ, SZ, SZ);
          var fd  = bz === 1 ? (fmap[bx+','+by] || null) : null;
          var isLogo = bz === 1 && bx === 0 && by === 0 && !fd && !plainCenter;

          // Material order: +X -X +Y -Y +Z -Z
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
            mesh: mesh,
            gx: bx, gy: by, gz: bz,
            data: fd,
            isFront: bz === 1,
            isLogo: isLogo,
            isCenter: bz === 1 && bx === 0 && by === 0
          });
        }
      }
    }

    return { group: group, pieces: pieces };
  }

  /* ── Scatter all pieces outward then navigate ── */
  function scatter(pieces, url, labelText) {
    if (!pieces || !pieces.length) { if (url) window.location.href = url; return; }

    // Show entering overlay if it exists
    var entEl = document.getElementById('jf-entering');
    var entTxt = document.getElementById('jf-entering-text');
    if (entEl) { entEl.classList.add('go'); if (entTxt && labelText) entTxt.textContent = 'Entering ' + labelText + '...'; }

    // Make all materials transparent
    pieces.forEach(function(p) {
      if (Array.isArray(p.mesh.material)) {
        p.mesh.material.forEach(function(m) { if (m) { m.transparent = true; } });
      }
    });

    // Assign velocities
    var vels = pieces.map(function(p) {
      var ox = p.gx + (Math.random() - .5) * 1.2;
      var oy = p.gy + (Math.random() - .5) * 1.2;
      var oz = (p.gz + 1) * (1.5 + Math.random());
      var spd = 9 + Math.random() * 11;
      return {
        vx: ox * spd, vy: oy * spd, vz: oz * spd,
        rx: (Math.random() - .5) * 14,
        ry: (Math.random() - .5) * 14,
        rz: (Math.random() - .5) * 14,
        op: 1
      };
    });

    var last = null;
    function tick(ts) {
      var dt = Math.min(last ? (ts - last) / 1000 : .016, .05);
      last = ts;
      var alive = false;
      pieces.forEach(function(p, i) {
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
          p.mesh.material.forEach(function(m) { if (m) m.opacity = v.op; });
        }
      });
      if (alive) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    if (url) setTimeout(function() { window.location.href = url; }, 680);
  }

  /* ── Raycaster helper ── */
  function makeRaycaster() {
    return { ray: new THREE.Raycaster(), m2: new THREE.Vector2() };
  }

  function hitFront(rc, pieces, camera, clientX, clientY, canvasEl) {
    var r = canvasEl.getBoundingClientRect();
    rc.m2.x = ((clientX - r.left) / r.width) * 2 - 1;
    rc.m2.y = -((clientY - r.top) / r.height) * 2 + 1;
    rc.ray.setFromCamera(rc.m2, camera);
    var meshes = pieces.filter(function(p) { return p.isFront; }).map(function(p) { return p.mesh; });
    var hits = rc.ray.intersectObjects(meshes, false);
    if (!hits.length) return null;
    return pieces.find(function(p) { return p.mesh === hits[0].object; }) || null;
  }

  return { build: build, addLights: addLights, scatter: scatter, makeRaycaster: makeRaycaster, hitFront: hitFront, GAP: GAP };
})();
