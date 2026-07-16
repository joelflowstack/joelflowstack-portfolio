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
    toggle.addEventListener("click", () => {
      const open = list.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
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

  function initCursorGlow() {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const glow = document.createElement("div");
    glow.id = "cursor-glow";
    document.body.appendChild(glow);
    let shown = false;
    window.addEventListener("mousemove", (e) => {
      glow.style.left = e.clientX + "px";
      glow.style.top = e.clientY + "px";
      if (!shown) { glow.classList.add("active"); shown = true; }
    }, { passive: true });
    window.addEventListener("mouseleave", () => glow.classList.remove("active"));
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
  // hidden while the cube is still the whole show, and fades in once the
  // person has scrolled all the way past it into regular page content —
  // i.e. once they've come out the "back door" below the cube.
  function initHeroNavVisibility() {
    const hero = document.getElementById("scroll-hero");
    const nav = document.querySelector(".site-nav");
    if (!hero || !nav) return; // not the landing page — nav stays visible as normal
    nav.classList.add("hero-hidden");
    const update = () => {
      const total = hero.offsetHeight - window.innerHeight;
      const scrolled = -hero.getBoundingClientRect().top;
      const pastHero = total > 0 ? scrolled >= total - 4 : true;
      nav.classList.toggle("hero-hidden", !pastHero);
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
    initCursorGlow();
    initNavScrollState();
    initPageTransitions();
    initHeroNavVisibility();
  });
})();
