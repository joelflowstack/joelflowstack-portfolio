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

  // Typewriter effect for the landing hero's left-side brand block — types
  // the company name once, then cycles through a rotating set of taglines
  // (type out, pause, delete, next) indefinitely. No-op on any page
  // without these elements, and skips straight to final text for anyone
  // with reduced-motion set.
  function initHeroTypewriter() {
    const nameEl = document.querySelector(".hero-brand-name");
    const sloganEl = document.querySelector(".hero-brand-slogan");
    if (!nameEl || !sloganEl) return;

    const companyName = "JOEL FLOWSTACK";
    const taglines = [
      "Building workflows that scale.",
      "Interfaces that think back.",
      "Where code meets creativity.",
      "Automation with an edge.",
      "3D web. Real intelligence.",
      "Turning ideas into interfaces.",
    ];

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      nameEl.textContent = companyName;
      sloganEl.textContent = taglines[0];
      return;
    }

    nameEl.textContent = "";
    sloganEl.textContent = "";

    let ci = 0;
    function typeName() {
      if (ci <= companyName.length) {
        nameEl.textContent = companyName.slice(0, ci) + (ci < companyName.length ? "▍" : "");
        ci++;
        setTimeout(typeName, 55);
      } else {
        nameEl.textContent = companyName;
        setTimeout(() => typeTagline(0), 300);
      }
    }

    function typeTagline(ti) {
      const text = taglines[ti];
      let i = 0;
      function type() {
        if (i <= text.length) {
          sloganEl.textContent = text.slice(0, i) + (i < text.length ? "▍" : "");
          i++;
          setTimeout(type, 42);
        } else {
          setTimeout(erase, 1900);
        }
      }
      function erase() {
        if (i >= 0) {
          sloganEl.textContent = text.slice(0, i) + "▍";
          i--;
          setTimeout(erase, 22);
        } else {
          setTimeout(() => typeTagline((ti + 1) % taglines.length), 350);
        }
      }
      type();
    }

    typeName();
  }

  function initNavScrollState() {
    const update = () => {
      const nav = document.querySelector(".site-nav");
      if (nav) nav.classList.toggle("scrolled", window.scrollY > 40);
    };
    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  // Cube-face page transitions — like switching virtual desktops on a
  // Compiz-style desktop cube: the outgoing page rotates away as if it's
  // one face of a box, the incoming page (a separate page load) rotates
  // in from the opposite face. Since these are genuinely different page
  // loads (not client-side routing), the two halves coordinate through
  // one sessionStorage flag: the outgoing click decides a direction and
  // stashes it; the incoming page reads it on load and animates in.
  const PAGE_ORDER = ["home.html", "about.html", "services.html", "portfolio.html", "blog.html", "contact.html"];
  function pageOrderIndex(pathname) {
    const file = pathname.split("/").pop() || "index.html";
    const i = PAGE_ORDER.indexOf(file);
    return i === -1 ? 0 : i;
  }

  function initPageTransitions() {
    document.body.classList.add("page-loaded");

    // Entrance half: if we arrived here via a cube-nav click, the
    // direction is waiting in sessionStorage — animate in from that side.
    const enterDir = sessionStorage.getItem("cubeEnterDir");
    if (enterDir) {
      sessionStorage.removeItem("cubeEnterDir");
      document.body.classList.add("cube-enter-" + enterDir);
      // Force a reflow so the browser registers the starting transform
      // before the "-active" class flips it — otherwise both classes
      // would land in the same frame and there'd be nothing to animate.
      void document.body.offsetHeight;
      requestAnimationFrame(() => {
        document.body.classList.add("cube-enter-active");
      });
      setTimeout(() => {
        document.body.classList.remove("cube-enter-" + enterDir, "cube-enter-active");
      }, 620);
    }

    // Exit half: intercept internal link clicks, rotate this page away,
    // tell the next page which direction to enter from, then navigate.
    document.addEventListener("click", (e) => {
      const link = e.target.closest("a[href]");
      if (!link) return;
      if (link.dataset.cubeNav) return; // handled by cube.js's own scatter-then-navigate transition
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      if (link.target === "_blank" || link.hasAttribute("download")) return;
      let url;
      try { url = new URL(href, window.location.href); } catch { return; }
      if (url.origin !== window.location.origin) return; // external link, no cube transition

      e.preventDefault();
      const goingForward = pageOrderIndex(url.pathname) >= pageOrderIndex(window.location.pathname);
      const exitDir = goingForward ? "left" : "right";   // this face rotates away toward that side
      const enterFrom = goingForward ? "right" : "left"; // the next page swings in from the opposite side

      sessionStorage.setItem("cubeEnterDir", enterFrom);
      document.body.classList.add("cube-exit-" + exitDir);
      setTimeout(() => { window.location.href = url.href; }, 520);
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
    // Floating-glass particles now live inside cube.js's own Three.js
    // scene (genuinely behind the cube, properly occluded by it) rather
    // than as a separate flat 2D overlay — see buildFloatingGlass() there.
    initNavScrollState();
    initHeroTypewriter();
    initPageTransitions();
    initHeroNavVisibility();
  });
})();
