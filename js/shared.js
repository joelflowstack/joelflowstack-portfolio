/**
 * JOEL FLOWSTACK — shared.js
 * Injects the site nav + footer on every inner page (so there's one
 * place to edit links) and runs a lightweight scroll-reveal for any
 * element with [data-reveal]. No dependencies, no build step.
 */
(function () {
  "use strict";

  const NAV_LINKS = [
    { label: "Home",      href: "home.html" },
    { label: "About",     href: "about.html" },
    { label: "Services",  href: "services.html" },
    { label: "Portfolio", href: "portfolio.html" },
    { label: "Blog",      href: "blog.html" },
    { label: "Contact",   href: "contact.html" },
  ];

  const SOCIALS = [
    { label: "X",        href: "https://x.com/Joelfowstack" },
    { label: "Instagram",href: "https://instagram.com/joel.fflowstack" },
    { label: "Threads",  href: "https://threads.net/@joel.fflowstack" },
    { label: "YouTube",  href: "https://youtube.com/@joelflowstack" },
    { label: "TikTok",   href: "https://tiktok.com/@joelflowstack" },
    { label: "Medium",   href: "https://medium.com/@joelflowstack" },
  ];

  function currentFile() {
    const parts = window.location.pathname.split("/");
    return parts[parts.length - 1] || "home.html";
  }

  function injectNav() {
    const mount = document.getElementById("site-nav");
    if (!mount) return;
    const here = currentFile();

    const links = NAV_LINKS.map(l =>
      `<li><a href="${l.href}" ${l.href === here ? 'class="active" aria-current="page"' : ""}>${l.label}</a></li>`
    ).join("");

    mount.innerHTML = `
      <nav class="site-nav">
        <a class="logo" href="index.html"><img src="assets/logo.png" alt="" width="26" height="26" style="border-radius:6px;vertical-align:middle;margin-right:8px;" /><b>JOEL</b> FLOWSTACK</a>
        <button class="nav-toggle" aria-label="Toggle menu" aria-expanded="false">&#9776;</button>
        <ul id="nav-links">${links}</ul>
      </nav>`;

    const toggle = mount.querySelector(".nav-toggle");
    const list = mount.querySelector("#nav-links");
    const setOpen = (open) => {
      list.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.innerHTML = open ? "&#10005;" : "&#9776;"; // ✕ vs ☰ — a real close affordance, not the same icon doing double duty
    };
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      setOpen(!list.classList.contains("open"));
    });
    document.addEventListener("click", (e) => {
      if (!list.classList.contains("open")) return;
      if (list.contains(e.target) || toggle.contains(e.target)) return;
      setOpen(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setOpen(false);
    });
    // A tapped link should close the menu, not leave it open under the
    // page-transition veil while the new page loads.
    list.querySelectorAll("a").forEach(a => a.addEventListener("click", () => setOpen(false)));
  }

  function injectFooter() {
    const mount = document.getElementById("site-footer");
    if (!mount) return;
    const socials = SOCIALS.map(s => `<a href="${s.href}" target="_blank" rel="noopener">${s.label}</a>`).join("");

    mount.innerHTML = `
      <footer class="site-footer">
        <div class="container">
          <div class="foot-grid">
            <div>
              <div class="logo" style="margin-bottom:10px;"><img src="assets/logo.png" alt="" width="22" height="22" style="border-radius:5px;vertical-align:middle;margin-right:8px;" />JOEL FLOWSTACK</div>
              <a href="mailto:joelflowstack@gmail.com">joelflowstack@gmail.com</a>
            </div>
            <div class="socials">${socials}</div>
          </div>
          <div class="fine">&copy; ${new Date().getFullYear()} Joel Flowstack. Built with Three.js, no build step.</div>
        </div>
      </footer>`;
  }

  function animateCount(el) {
    const raw = el.textContent.trim();
    const match = raw.match(/^(-?\d+)(.*)$/); // leading integer + suffix (%, +, etc.)
    if (!match) { el.classList.add("counted"); return; } // non-numeric stat, e.g. "GitHub → Vercel"
    const target = parseInt(match[1], 10);
    const suffix = match[2] || "";
    if (Math.abs(target) > 999 || Number.isNaN(target)) { el.classList.add("counted"); return; }
    const duration = 900;
    const start = performance.now();
    function frame(now) {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(frame);
      else el.classList.add("counted");
    }
    requestAnimationFrame(frame);
  }

  function initReveal() {
    const els = document.querySelectorAll("[data-reveal]");
    if (!els.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          entry.target.querySelectorAll(".stat .num").forEach(animateCount);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    els.forEach(el => io.observe(el));
  }

  function initTabs() {
    document.querySelectorAll("[data-tabs]").forEach((group) => {
      const buttons = group.querySelectorAll(".tab-btn");
      const panels = group.querySelectorAll(".tab-panel");
      buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
          const target = btn.getAttribute("data-tab");
          buttons.forEach(b => b.classList.toggle("active", b === btn));
          panels.forEach(p => p.classList.toggle("active", p.getAttribute("data-panel") === target));
        });
      });
    });
  }

  function initScrollProgress() {
    const bar = document.createElement("div");
    bar.id = "scroll-progress";
    document.body.appendChild(bar);
    const update = () => {
      const h = document.documentElement;
      const pct = h.scrollHeight > h.clientHeight
        ? (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100
        : 0;
      bar.style.width = pct + "%";
    };
    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  // Floating glass diamonds — the site's signature ambient effect.
  // Translucent blue quadrilaterals drifting slowly everywhere, gently
  // pushed aside as the cursor nears them. Plain 2D canvas (not Three.js)
  // so this stays cheap and works identically on every page, cube or not.
  function initFloatingGlass() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = document.createElement("canvas");
    canvas.id = "floating-glass";
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    let w, h;
    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    const count = window.innerWidth < 760 ? 9 : 17;
    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      size: 16 + Math.random() * 30,
      vx: (Math.random() - 0.5) * 0.10,
      vy: (Math.random() - 0.5) * 0.10,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.0025,
      depth: 0.4 + Math.random() * 0.6, // parallax depth — affects glow strength, opacity, and how strongly the cursor pushes it
    }));

    // Touch devices have no persistent cursor position — default it to
    // off-screen so the push effect simply never triggers there, rather
    // than pinning to a stale (0,0) corner.
    let mouseX = -9999, mouseY = -9999;
    window.addEventListener("mousemove", (e) => { mouseX = e.clientX; mouseY = e.clientY; }, { passive: true });

    function drawDiamond(p) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      const s = p.size;
      // Slightly kite-shaped rather than a perfect rhombus — reads less
      // like a generic icon, more like a cut gem facet.
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.6, -s * 0.05);
      ctx.lineTo(0, s);
      ctx.lineTo(-s * 0.6, -s * 0.05);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, -s, 0, s);
      grad.addColorStop(0, `rgba(214,238,255,${0.22 * p.depth})`);
      grad.addColorStop(0.5, `rgba(94,172,230,${0.12 * p.depth})`);
      grad.addColorStop(1, `rgba(63,169,232,${0.05 * p.depth})`);
      ctx.fillStyle = grad;
      ctx.shadowColor = "rgba(63,169,232,.6)";
      ctx.shadowBlur = 20 * p.depth;
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(232,247,255,${0.4 * p.depth})`;
      ctx.stroke();
      ctx.restore();
    }

    function tick() {
      ctx.clearRect(0, 0, w, h);
      particles.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.rot += p.vrot;
        if (p.x < -60) p.x = w + 60; else if (p.x > w + 60) p.x = -60;
        if (p.y < -60) p.y = h + 60; else if (p.y > h + 60) p.y = -60;

        const dx = p.x - mouseX, dy = p.y - mouseY;
        const dist = Math.hypot(dx, dy);
        const radius = 170;
        if (dist < radius) {
          const force = (1 - dist / radius) * 0.7 * p.depth;
          const inv = 1 / (dist || 1);
          p.x += dx * inv * force;
          p.y += dy * inv * force;
        }
        drawDiamond(p);
      });
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function initNavScrollState() {
    const update = () => {
      const nav = document.querySelector(".site-nav");
      if (nav) nav.classList.toggle("scrolled", window.scrollY > 40);
    };
    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  // Soft fade-to-black transition on internal navigation, instead of an
  // abrupt jump cut between pages.
  function initPageTransitions() {
    const veil = document.createElement("div");
    veil.id = "page-veil";
    document.body.appendChild(veil);
    document.body.classList.add("page-loaded");

    document.addEventListener("click", (e) => {
      const link = e.target.closest("a[href]");
      if (!link) return;
      if (link.dataset.cubeNav) return; // handled by cube.js's own scatter-then-navigate transition
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      if (link.target === "_blank" || link.hasAttribute("download")) return;
      let url;
      try { url = new URL(href, window.location.href); } catch { return; }
      if (url.origin !== window.location.origin) return; // external link, no veil

      e.preventDefault();
      veil.classList.add("visible");
      setTimeout(() => { window.location.href = url.href; }, 380);
    });
  }

  // On the landing page only (where #scroll-hero exists), the nav stays
  // On the landing page only (where #scroll-hero exists), the nav is
  // genuinely removed from the DOM — not hidden via CSS — while the cube
  // hero is on screen. It only gets created once the person has scrolled
  // past it into regular page content, i.e. once they've come out the
  // "back door" below the cube. Real erasure, not a display/opacity trick.
  function initHeroNavVisibility() {
    const hero = document.getElementById("scroll-hero");
    const mount = document.getElementById("site-nav");
    if (!hero || !mount) return; // not the landing page — nav stays as normal

    let navExists = true;
    const eraseNav = () => { if (navExists) { mount.innerHTML = ""; navExists = false; } };
    const restoreNav = () => { if (!navExists) { injectNav(); navExists = true; } };

    eraseNav(); // starts fully removed, before any scroll

    const update = () => {
      const total = hero.offsetHeight - window.innerHeight;
      const scrolled = -hero.getBoundingClientRect().top;
      const pastHero = total > 0 ? scrolled >= total - 4 : true;
      if (pastHero) restoreNav(); else eraseNav();
    };
    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  document.addEventListener("DOMContentLoaded", () => {
    injectNav();
    injectFooter();
    initReveal();
    initTabs();
    initScrollProgress();
    initFloatingGlass();
    initNavScrollState();
    initPageTransitions();
    initHeroNavVisibility();
  });
})();
